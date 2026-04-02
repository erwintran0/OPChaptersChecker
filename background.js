const API_URL = 'https://www.reddit.com/r/OnePiece/search.json?q=one+piece+chapter+flair%3ACurrent%2BChapter&restrict_sr=on&sort=new&t=all&limit=6';
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

function parseChapterFromTitle(title) {
  const m = title.match(/chapter\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

// Check for recent chapters and update badge
async function checkRecentChapters() {
  // Only check on Thursday (4), Friday (5), and Saturday (6)
  const today = new Date().getDay();
  const allowedDays = [4, 5, 6]; // Thursday, Friday, Saturday

  if (!allowedDays.includes(today)) {
    return;
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OnePieceChapChecker/1.0'
      }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (!data || !data.data || !data.data.children) {
      return;
    }

    const posts = data.data.children
      .map(item => item.data)
      .filter(post => post?.title && !/Official Release Discussion/i.test(post.title));

    if (posts.length === 0) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const recentPosts = posts.filter(post => {
      const postDate = new Date(post.created_utc * 1000);
      return isWithinDays(postDate, 7);
    });

    if (recentPosts.length > 0) {
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
      chrome.action.setBadgeTextColor({ color: '#ffffff' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error checking chapters:', error);
  }
}

// Check if date is within X days
function isWithinDays(date, days) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

// Listen for when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed!');
  checkRecentChapters();
});

// Check for recent chapters periodically
setInterval(checkRecentChapters, CHECK_INTERVAL);

// Also check when extension starts up
checkRecentChapters();
