# LoreGuard user guide

LoreGuard is an offline EPUB reader. Books you add are copied into the app. Reading, bookmarks, highlights, and in-book search work with no internet.

## Library

- **+ Add** copies EPUB files or a whole folder into the app.
- The **⋮** menu on a cover pins a book, edits labels, deletes it, or (on Android) adds a home-screen shortcut.
- **Settings** covers lookup engines, backups, and default highlight color.

## Reading chrome

**Double-tap** the page to show or hide the bar.

You get **two** icon buttons and the title in the middle:

- **☰** — contents, bookmarks, and Library
- **⋮** — Notes, Text, Display, Color, find, bookmark this page

If **Display → Buttons** is on, previous/next page buttons appear as well (**four** buttons total).

The page shifts down so the bar does not cover the first lines. The bar also sits below the phone’s status / notification icons.

The corner shows **book and chapter percent** while you scroll, or **chapter page n / N** in page modes.

## Turn pages

In **Menu → Display → Turn pages**:

| Mode | How pages move |
| --- | --- |
| Swipe | Swipe left or right |
| Buttons | On-screen ‹ › |
| Volume | Volume up = previous, volume down = next (Android) |
| Scroll | Scroll through the chapter; swipe sideways to change chapter |

## Bookmarks

**Single-tap a word** to show a bookmark ribbon beside that paragraph (or heading). Tap the ribbon, name the bookmark, and find it under **Library → Bookmarks**. Saved ribbons stay visible.

**Bookmark this page** in Menu saves the current place.

## Highlights and notes

1. Long-press a word, then drag the orange handles to set the start and end.
2. The tool panel appears **above** the selection.
3. Tap **Highlight**, **Underline**, or **Font color** to apply, then a color if you want another. Bold, italic, strike, and squiggle apply at once.
4. Tap an existing mark to select the whole span, then change its color/style or **Remove**.
5. **Note** opens a blank note field. **Menu → Notes** lists only notes you wrote.

## Typeface

**Menu → Text → Typeface → As printed** keeps the EPUB’s fonts and heading styles. Pick another face or turn **Justified** on to override. Headings stay larger than body copy.

## Brightness

**Menu → Display**: Auto follows the phone; Manual sets a level for LoreGuard only.

## Gestures

| Gesture | Result |
| --- | --- |
| Double-tap | Show or hide Library and Menu |
| Single-tap a word | Show a bookmark ribbon on that paragraph |
| Single-tap the ribbon | Name or edit the paragraph bookmark |
| Single-tap a highlight | Select the whole mark |
| Tap away from a selection | Drop the selection |
| Swipe (in Swipe mode) | Turn the page |
| Swipe sideways (in Scroll mode) | Previous / next chapter |
| Long-press then drag handles | Select text; stays selected until you tap away |
| Pinch | Change type size |

## Backup

Settings → Backup exports highlights, notes, and bookmarks as JSON. EPUB files stay on the device; export does not include the books themselves.

## Updates

Installs from GitHub use the same Android id (`com.epubreader.app`). A newer **versionCode** replaces the previous LoreGuard on the phone and keeps your library.
