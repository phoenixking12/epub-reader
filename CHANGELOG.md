# Changelog

All notable changes to LoreGuard are recorded here. Version numbers follow [SemVer](https://semver.org/).

## 3.1.9 — 2026-09-13

### Added

- Library shelf with one spine per uploaded book, plus a short opening animation
- Book and chapter progress scrubber (chapter rail in scroll mode)

### Fixed

- Bookmark list jumps to the saved CFI instead of a nearby quote
- Font-color marks select as a group, can be recolored, and have Remove
- Reading menu no longer lists Color or Bookmark this page; Bookmark is on the bar
- Chapter read percent uses leftover scroll, not raw offset / chapter height
- Press-then-scroll jitter in the reader

## 3.1.8 — 2026-09-12

### Fixed

- Reading text fills the screen below the Android status bar and above the navigation bar
- Double-tap still opens the reading bar, and the page reflows so the bar no longer covers lines
- Default page gap/margins are tighter so unused gutter is gone
- Chapter scroll follows the finger more quickly and coasts farther
- Bookmark, note, and search fields rise above the keyboard instead of hiding under it

## 3.1.7 — 2026-09-10

### Fixed

- Long-press then scrolling no longer makes the words jitter: selection stays live until you lift, a vertical pan cancels it, and the page does not turn to chase the caret
- The page uses the full screen except the Android notification and option bars (no extra black page chrome; the side-margin slider only insets left/right)
- Highlighting, dismissing a selection, or removing a mark no longer opens the reading title bar

## 3.1.6 — 2026-09-10

### Fixed

- Scroll mode pans the chapter again (1:1 drag plus a fling), instead of a dead native iframe pan
- A single tap shows a small bookmark button on every paragraph; tap the button to name it
- Reading bar sits below the Android notification icons (no clipping, no extra black band)

## 3.1.5 — 2026-09-10

### Fixed

- Double-tap on text or a cover opens the reading bar, not only empty margins
- The bar sits just under the Android status bar (no extra black band)
- Selection tooltip is smaller; custom start/end blips hide the system handles
- Font color paints the words via a span (Android WebView ignores `::highlight` color)
- A single tap on a paragraph shows a 7px bookmark dot; tap the dot to name it
- Scroll uses the native pan again instead of a JS-driven drag
- Typeface defaults to the book's own font (Text → Book default)

## 3.1.4 — 2026-09-09

### Fixed

- Long-press keeps the Android word selection so highlight, note, copy, and bookmark tools can appear
- Highlight / underline / font-color apply as soon as you tap the style
- Double-tap still toggles the reading bar; a single tap on a paragraph still names a bookmark
- Android versionCode 12 so this APK updates 3.1.3

## 3.1.3 — 2026-09-09

### Fixed

- Reading bar sits just under the notification icons: the WebView is fullscreen, and only the chrome is padded (no extra black band)
- Long-press selects a word and shows the highlight tooltip; the book iframe allows text selection
- Scroll no longer fights long-press: a pan cancels selection, and selection updates are rAF-throttled so the page does not shake
- Tap a paragraph, the star on the bar, or **Bookmark this page** to save a place (dots no longer steal the tap)
- Android versionCode 11 so this APK updates 3.1.2

## 3.1.2 — 2026-09-09

### Fixed

- The reading bar sits below the Android notification bar (WebView margins, not padding that HTML ignores)
- Chapters without a `<head>` still get reader CSS, so subheadings actually render larger and bold
- Scroll stays smooth: bookmark dots are not rebuilt on every relocate, and scroll-mode touchmove is passive
- **Bookmark this page** uses the live CFI; a broken saved location no longer aborts opening the chapter
- Bold (700) faces are loaded so heading weight is not synthesized

## 3.1.1 — 2026-09-09

### Fixed

- Top inset is only the status bar, so reading text sits just under the notification icons
- Paginated chapters no longer sit in a tall empty band; the page fills to an 8px margin
- Long-press selects a word instead of the whole paragraph or page
- Vertical pans (and the mouse wheel) in Scroll mode move through the chapter; sideways swipe still changes chapter
- Paragraph bookmark marks are 8px dots with a 28px tap target; the name sheet is compact
- Chapter subheadings (`h2`/`h3` and common subtitle classes) render larger and bold
- Android versionCode 9 so this APK updates 3.1.0 and 3.0.x installs

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
