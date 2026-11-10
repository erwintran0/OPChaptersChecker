const MANGADEX_MANGA_ID = 'a1c7c817-4e59-43b7-9365-09675a149a6f';
const MANGADEX_FEED_URL = `https://api.mangadex.org/manga/${MANGADEX_MANGA_ID}/feed?translatedLanguage%5B%5D=en&order%5Bchapter%5D=desc&limit=100&includes%5B%5D=scanlation_group`;
const CHECK_INTERVAL_MINUTES = 60;
const BREAK_WEEK_GAP_DAYS = 10;
const NEW_CHAPTER_BADGE_DAYS = 1;

function parseChapters(response) {
  const releases = [];
  const seenChapters = new Set();

  for (const entry of response.data || []) {
    const { chapter, title, externalUrl, publishAt } = entry.attributes || {};
    if (!chapter || seenChapters.has(chapter)) continue;

    seenChapters.add(chapter);
    releases.push({
      chapterNumber: chapter,
      title: title ? `Chapter ${chapter}: ${title}` : `Chapter ${chapter}`,
      releaseDate: publishAt,
      breakAfter: false,
      url: externalUrl || `https://mangadex.org/chapter/${entry.id}`
    });
  }

  releases.sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate));
  const chapters = releases.slice(0, 3);
  for (let index = 0; index < chapters.length; index += 1) {
    const releaseTime = Date.parse(chapters[index].releaseDate);
    const nextReleaseTime = index > 0 ? Date.parse(chapters[index - 1].releaseDate) : NaN;
    if (
      Number.isFinite(releaseTime) &&
      Number.isFinite(nextReleaseTime) &&
      (nextReleaseTime - releaseTime) / (24 * 60 * 60 * 1000) > BREAK_WEEK_GAP_DAYS
    ) {
      chapters[index].breakAfter = true;
    }
  }

  if (chapters.length === 0) {
    throw new Error('MangaDex did not return any parseable English One Piece chapters');
  }
  return chapters;
}

async function fetchMangaDexData() {
  const cached = await chrome.storage.local.get([
    'mangaDexChapters',
    'mangaDexFetchedAt'
  ]);
  if (
    cached.mangaDexChapters &&
    cached.mangaDexChapters.every(
      chapter => chapter.releaseDate && typeof chapter.breakAfter === 'boolean'
    ) &&
    cached.mangaDexFetchedAt &&
    Date.now() - cached.mangaDexFetchedAt < CHECK_INTERVAL_MINUTES * 60 * 1000
  ) {
    await updateNewChapterBadge(cached.mangaDexChapters);
    return cached.mangaDexChapters;
  }

  const response = await fetch(MANGADEX_FEED_URL, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`MangaDex request failed (${response.status})`);
  }

  const chapters = parseChapters(await response.json());

  await chrome.storage.local.set({
    mangaDexChapters: chapters,
    mangaDexFetchedAt: Date.now()
  });
  await updateNewChapterBadge(chapters);
  return chapters;
}

async function updateNewChapterBadge(chapters) {
  const releaseTime = Date.parse(chapters[0]?.releaseDate);
  const ageInDays = (Date.now() - releaseTime) / (24 * 60 * 60 * 1000);
  const isNew = Number.isFinite(releaseTime) && ageInDays >= 0 && ageInDays <= NEW_CHAPTER_BADGE_DAYS;

  await chrome.action.setBadgeText({ text: isNew ? 'NEW' : '' });
  if (isNew) {
    await chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
    await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  }
}

function clearLegacyData() {
  return chrome.storage.local.remove([
    'redditAccessToken',
    'redditTokenExpiresAt',
    'redditRefreshToken',
    'chapters',
    'timestamp',
    'cacheDuration'
  ]);
}

function clearMangaUpdatesData() {
  return chrome.storage.local.remove([
    'mangaUpdatesChapters',
    'mangaUpdatesFetchedAt',
    'mangaUpdatesLatestChapter'
  ]);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'mangadex.fetch') return;

  fetchMangaDexData()
    .then(chapters => {
      sendResponse({ ok: true, chapters });
    })
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function checkForNewChapters() {
  try {
    await fetchMangaDexData();
  } catch (error) {
    console.error('Error checking MangaDex chapters:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  Promise.all([clearLegacyData(), clearMangaUpdatesData()])
    .then(checkForNewChapters)
    .catch(error => console.error('Error migrating extension storage:', error));
  chrome.alarms.clear('mangaupdates-check');
  chrome.alarms.create('mangadex-check', { periodInMinutes: CHECK_INTERVAL_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  clearLegacyData()
    .then(checkForNewChapters)
    .catch(error => console.error('Error cleaning legacy extension data:', error));
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'mangadex-check') checkForNewChapters();
});
