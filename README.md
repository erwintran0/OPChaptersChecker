# One Piece Chapters Checker

A lightweight Chrome extension that helps you quickly check the latest One Piece chapter discussions from Reddit and highlights when a new chapter appears.

## Overview

This extension fetches recent posts from r/OnePiece filtered to the "Current Chapter" flair, extracts the chapter number and title, and shows them in a compact popup window. It also adds a badge to the extension icon during the active release window and keeps data cached locally so the popup loads quickly.

## Features

- Displays the latest One Piece chapter posts from Reddit
- Filters out official discussion threads and unrelated results
- Parses chapter numbers and titles from post metadata
- Marks entries from the most recent release period as "NEW"
- Shows whether a post indicates a break or no-break week
- Keeps a local cache to reduce repeated network requests
- Includes a direct link to the official chapter tracker site
- Updates the extension badge during relevant days of the week

## Screenshots

The popup displays recent chapter entries with the chapter title, publication age, and a small label showing whether the next week is expected to have a break.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select the folder containing this project.
6. The extension icon will appear in your browser toolbar.

## Project Structure

- `manifest.json` — Chrome extension manifest and permissions
- `popup.html` — popup UI markup and styling
- `popup.js` — Reddit fetch logic, parsing, and popup rendering
- `background.js` — periodic badge update logic and background checks
- `icons/` — extension icons for different sizes
- `resize_icon.py` — helper script for generating icon sizes

## How It Works

- The extension calls Reddit's JSON API for recent posts in the One Piece subreddit.
- It filters posts by chapter-related content and excludes official discussion threads.
- Chapter titles are parsed from the post self-text and titles.
- Results are cached in `chrome.storage.local` to avoid repeated calls.
- A background service worker checks for recent activity and updates the extension badge.

## Notes

- This project is intended for convenience and quick checking, not as an official release source.
- The code relies on Reddit's public JSON endpoints and may require a valid user-agent header.
- The badge update logic is intentionally limited to Thursday-Saturday, when chapter announcements are most likely to appear.

## License

This project does not currently include a license file. If you plan to distribute or share it publicly, consider adding a license such as MIT or Apache 2.0.

## Contributing

If you want to improve the extension, feel free to fork the repository and open a pull request with your changes.

## Author

Erwin Tran
