# Changelog

All notable changes to LoreGuard are recorded here. Version numbers follow [SemVer](https://semver.org/).

## 3.0.3 — 2026-09-09

### Fixed

- Top inset is only the status bar, so reading text sits just under the notification icons
- Long-press selects a word instead of the whole paragraph or page
- Vertical pans in Scroll mode move through the chapter; sideways swipe still changes chapter
- Paragraph bookmark dots and the name sheet take less space
- Chapter subheadings (`h2`/`h3` and common subtitle classes) render larger and bold

## 3.0.2 — 2026-09-09

### Added

- In Scroll mode, a sideways swipe turns the chapter while vertical scrolling still moves the lines

### Fixed

- Hamburger and overflow stay on-screen; status bar no longer covers them
- Long-press keeps the word selected until you tap elsewhere
- Extra left gutter from system-bar padding and the old 24px margin

## 3.0.1 — 2026-09-09

### Fixed

- Android APK build: drop TextView-only selection APIs that WebView does not have

## 3.0.0 — 2026-09-09

### Added

- Corner progress: book and chapter percent while scrolling; chapter page `n / N` in page modes
- Tap an existing highlight to select it, then change style/color or remove it
- Paragraph bookmark dots stay inside the page; a single tap on a paragraph shows them
- Double-tap shows the reading bar; a tap on a highlight selects the whole mark
- Slim vertical-bar selection handles replace the system (Google) ones

### Changed

- The reading bar pushes the page down instead of covering the first lines
- The last page/chapter no longer wraps back to the start
- Notes no longer repeat the highlighted quote
- Typeface changes apply inside the book iframe
- Extra CSS was removed from Text settings
- Android versionCode 5 so this APK updates the 2.1 install
- System-bar padding so Library, Close, and sheet buttons stay on screen

## 2.1.0 — 2026-09-08

### Added

- Font color on a selection, plus bold, italic, strike, and squiggle in the tooltip
- Reasily-style reading bar: hamburger, centered title, overflow menu

### Changed

- Selection tools sit above the text, with larger orange handles
- Color chips apply the chosen style (highlight, underline, or font color)
- Android versionCode 4 so this APK updates the 2.0 install

## 2.0.0 — 2026-09-08

### Added

- Reading modes: swipe, on-screen buttons, volume keys, or scroll each chapter
- Paragraph bookmark icons when the bars are visible
- Draggable start/end handles on a text selection
- Separate Menu items for Text, Display, and Color

### Changed

- Tap once shows two controls (Library and Menu), or four when page-turn buttons are on
- Library opens contents and bookmarks; Notes lists only notes you wrote
- Selection tools sit under the highlighted text and no longer pin to the bottom of the screen
- Version 2.0.0 / Android versionCode 3 upgrades the existing `com.epubreader.app` install and keeps the same local library

## 1.1.0 — 2026-09-08

### Added

- LoreGuard name and phoenix/book launcher artwork
- Reader title bar with Notes, Contents, and a single Menu
- Paragraph bookmarks: tap a paragraph, name it, find it under Bookmarks
- Custom highlight colors saved from the color wheel
- Auto brightness that follows the device; optional manual override
- Product docs: user guide, release process, this changelog

### Changed

- Fewer always-visible reader buttons; Find, Reading, and page bookmark live in Menu
- Long-press selection uses only the in-app toolbar (Android text popup is dismissed)
- Drawer splits Contents/Bookmarks from Notes

## 1.0.0 — 2026-09-07

First Android release: offline EPUB library, highlights, search, folder import, and GitHub Actions APK builds.
