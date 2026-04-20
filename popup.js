const API_URL = 'https://www.reddit.com/r/OnePiece/search.json?q=one+piece+chapter+flair%3ACurrent%2BChapter&restrict_sr=on&sort=new&t=all&limit=6';

const chaptersList = document.getElementById('chapters');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

const RECENT_DAYS = 1;

function parseChapterFromTitle(title) {
  // Look for chapter number in title: "... Chapter 1178 ..."
  const m = title.match(/chapter\s*(\d+)/i);
  return m ? m[1] : null;
}

// Fetch chapters from Reddit
async function fetchChapters() {
  try {
    // Check for cached data first
    const cached = await getCachedChapters();
    if (cached && isCacheValid(cached)) {
      displayChapters(cached.chapters, true);
      // Try to refresh in background if cache is getting old
      if (shouldRefreshCache(cached)) {
        fetchFreshChapters().catch(err => console.log('Background refresh failed:', err));
      }
      return;
    }

    // No valid cache, fetch fresh data
    await fetchFreshChapters();
  } catch (err) {
    console.log('Error in fetchChapters:', err);

    // Try to show cached data even if expired
    const cached = await getCachedChapters();
    if (cached) {
      displayChapters(cached.chapters, true);
      error.style.display = 'block';
      error.textContent = 'Showing cached data. Connection issues detected.';
      return;
    }

    // No cache available, show error
    loading.style.display = 'none';
    error.style.display = 'block';
    error.textContent = 'Error: ' + err.message;
  }
}

// Fetch fresh chapters from API
async function fetchFreshChapters() {
  const response = await fetch(API_URL, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'OnePieceChapChecker/1.0'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Reddit posts');
  }

  const data = await response.json();
  if (!data || !data.data || !data.data.children) {
    throw new Error('Invalid Reddit response');
  }

  const posts = data.data.children
    .map(item => item.data)
    .filter(post => post && post.title && !/Official Release Discussion/i.test(post.title));

  const chapters = posts
    .map(post => {
      const chapterNumber = parseChapterFromTitle(post.title) || 'N/A';
      const created = new Date(post.created_utc * 1000);
      const isRecent = isWithinDays(created, RECENT_DAYS);
      const hasNoBreak = post.selftext && post.selftext.includes('NO BREAK NEXT WEEK');

      return {
        title: post.title,
        chapterNumber,
        created,
        isRecent,
        hasNoBreak,
        url: `https://www.reddit.com${post.permalink}`,
      };
    })
    .slice(0, 3);

  if (chapters.length === 0) {
    throw new Error('No chapters found in Reddit results');
  }

  // Cache the successful result with dynamic duration
  await cacheChapters(chapters);

  displayChapters(chapters);
}

// Display chapters in the popup
function displayChapters(chapters, isFromCache = false) {
  chaptersList.innerHTML = '';

  chapters.forEach(item => {
    const li = document.createElement('li');
    li.className = `chapter-item ${item.isRecent ? 'recent' : 'old'}`;

    let html = `<div class="chapter-title">${item.title}</div>`;
    html += `<div class="chapter-date">${formatDate(item.created)}`;

    if (item.isRecent) {
      html += ' <span class="new-badge">NEW</span>';
    }

    // Add break text on the right side
    if (item.hasNoBreak) {
      html += '<span class="break-text"></span>';
    } else {
      html += '<span class="break-text">(break)</span>';
    }
    html += `</div>`;

    li.innerHTML = html;
    li.addEventListener('click', () => {
      chrome.tabs.create({ url: item.url });
    });
    chaptersList.appendChild(li);
  });

  loading.style.display = 'none';
  chaptersList.style.display = 'block';
}

// Check if date is within X days
function isWithinDays(date, days) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

// Format date nicely
function formatDate(date) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

  console.log(date);
  if (diffDays === 0 && diffHours === 0) {
    return 'Less than an hour ago';
  } else if (diffDays === 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return `${diffDays} days ago`;
  }
}

// Escape HTML special characters
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cache management functions
async function getCachedChapters() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['chapters', 'timestamp', 'cacheDuration'], (result) => {
      if (result.chapters && result.timestamp && result.cacheDuration) {
        // Convert ISO strings back to Date objects for calculations
        const chapters = result.chapters.map(chapter => ({
          ...chapter,
          created: new Date(chapter.created)
        }));

        resolve({
          chapters: chapters,
          timestamp: result.timestamp,
          cacheDuration: result.cacheDuration
        });
      } else {
        resolve(null);
      }
    });
  });
}

async function cacheChapters(chapters) {
  return new Promise((resolve) => {
    // Determine cache duration based on content recency
    const hasRecentChapters = chapters.some(chapter => chapter.isRecent);
    const cacheDuration = hasRecentChapters
      ? 4 * 60 * 60 * 1000  // 4 hours if recent chapters exist
      : 60 * 60 * 1000;     // 1 hour if all chapters are old

    // Convert Date objects to ISO strings for storage
    const chaptersForStorage = chapters.map(chapter => ({
      ...chapter,
      created: chapter.created.toISOString()
    }));

    const data = {
      chapters: chaptersForStorage,
      timestamp: Date.now(),
      cacheDuration: cacheDuration
    };

    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

function isCacheValid(cached) {
  if (!cached || !cached.timestamp || !cached.cacheDuration) return false;
  return (Date.now() - cached.timestamp) < cached.cacheDuration;
}

function shouldRefreshCache(cached) {
  if (!cached || !cached.timestamp || !cached.cacheDuration) return true;
  // Refresh when 75% of cache duration has passed
  const refreshThreshold = cached.cacheDuration * 0.75;
  return (Date.now() - cached.timestamp) > refreshThreshold;
}

// Fetch chapters on popup open
fetchChapters();

// Website button click handler
document.getElementById('websiteBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://tcbonepiecechapters.com/mangas/5/one-piece' });
});

/*
// Clear cache button functionality
document.getElementById('clearCacheBtn').addEventListener('click', async () => {
  const clearBtn = document.getElementById('clearCacheBtn');
  
  // Show loading state
  clearBtn.textContent = 'Clearing...';
  clearBtn.disabled = true;
  
  try {
    // Clear all cached data
    await chrome.storage.local.remove(['chapters', 'timestamp', 'cacheDuration']);
    
    // Reload fresh data
    await fetchFreshChapters();
    
    clearBtn.textContent = 'Cache Cleared!';
    setTimeout(() => {
      clearBtn.textContent = 'Clear Cache & Reload';
    }, 2000);
  } catch (err) {
    console.error('Cache clear failed:', err);
    clearBtn.textContent = 'Error - Try Again';
    setTimeout(() => {
      clearBtn.textContent = 'Clear Cache & Reload';
    }, 2000);
  } finally {
    clearBtn.disabled = false;
  }
});
*/
