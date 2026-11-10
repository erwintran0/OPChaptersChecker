const RECENT_CHAPTER_DAYS = 7;
const chaptersList = document.getElementById('chapters');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

async function fetchChapters() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'mangadex.fetch' });
    if (!result?.ok) throw new Error(result?.error || 'Failed to load MangaDex chapters');
    displayChapters(result.chapters);
  } catch (err) {
    loading.style.display = 'none';
    error.style.display = 'block';
    error.textContent = `Error: ${err.message}`;
  }
}

function displayChapters(chapters) {
  chaptersList.replaceChildren();

  for (const [index, chapter] of chapters.entries()) {
    const item = document.createElement('li');
    item.className = 'chapter-item';
    item.tabIndex = 0;

    const heading = document.createElement('div');
    heading.className = 'chapter-heading';

    const title = document.createElement('div');
    title.className = 'chapter-title';
    const chapterNumber = document.createElement('strong');
    chapterNumber.textContent = `Chapter ${chapter.chapterNumber}`;
    title.appendChild(chapterNumber);
    const titleRemainder = chapter.title.slice(chapterNumber.textContent.length);
    if (titleRemainder) title.appendChild(document.createTextNode(titleRemainder));
    heading.appendChild(title);

    if (index === 0) {
      const latestLabel = document.createElement('span');
      latestLabel.className = 'latest-label';
      latestLabel.textContent = 'LATEST';
      heading.appendChild(latestLabel);
    }

    const releaseTime = Date.parse(chapter.releaseDate);
    const ageInDays = (Date.now() - releaseTime) / (24 * 60 * 60 * 1000);
    if (Number.isFinite(releaseTime) && ageInDays >= 0 && ageInDays <= RECENT_CHAPTER_DAYS) {
      item.classList.add('recent-chapter');
    }
    item.appendChild(heading);

    const footer = document.createElement('div');
    footer.className = 'chapter-footer';

    const releaseAge = document.createElement('span');
    releaseAge.className = 'chapter-release-age';
    if (Number.isFinite(releaseTime) && ageInDays >= 0) {
      const wholeDays = Math.floor(ageInDays);
      releaseAge.textContent = wholeDays === 0
        ? 'Released today'
        : `Released ${wholeDays} day${wholeDays === 1 ? '' : 's'} ago`;
    } else {
      releaseAge.textContent = 'Release date unavailable';
    }
    footer.appendChild(releaseAge);

    if (chapter.breakAfter) {
      const breakLabel = document.createElement('span');
      breakLabel.className = 'chapter-break';
      breakLabel.textContent = 'Break';
      const breakDot = document.createElement('span');
      breakDot.className = 'chapter-break-dot';
      breakDot.setAttribute('aria-hidden', 'true');
      breakLabel.appendChild(breakDot);
      footer.appendChild(breakLabel);
    }
    item.appendChild(footer);

    const openSeries = () => chrome.tabs.create({ url: chapter.url });
    item.addEventListener('click', openSeries);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSeries();
      }
    });
    chaptersList.appendChild(item);
  }

  loading.style.display = 'none';
  chaptersList.style.display = 'block';
}

fetchChapters();

document.getElementById('websiteBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://tcbonepiecechapters.com/mangas/5/one-piece' });
});
