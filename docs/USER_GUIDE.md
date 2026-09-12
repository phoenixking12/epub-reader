# LoreGuard user guide

LoreGuard is an offline EPUB reader. Books you add are copied into the app. Reading, bookmarks, highlights, and in-book search work with no internet.

## Library

- **+ Add** copies EPUB files or a whole folder into the app.
- The shelf at the top shows one spine for every book, with the same titles as the grid below.
- The **⋮** menu on a cover pins a book, edits labels, deletes it, or (on Android) adds a home-screen shortcut.
- **Settings** covers lookup engines, backups, and default highlight color.

## Reading chrome

**Double-tap** the page to show or hide the bar.

You get the title in the middle, with:

- **☰** — contents, bookmarks, and Library
- **Bookmark** (ribbon icon) — save the current place
- **⋮** — Notes, Text, Display, Find in book, and Listen when the book has audio

If **Display → Buttons** is on, previous/next page buttons appear as well.

The reading bar sits immediately under the notification icons. The dark bar runs behind the status icons; the buttons sit just below them, with no extra black gap.

The scrubber at the bottom is off unless you turn on **Display → Progress slider**. Percent read always sits at the bottom like a page number: **book %** and **chapter %** while you scroll, or **n / N** in page modes.

## Turn pages

In **Menu → Display → Turn pages**:

| Mode | How pages move |
| --- | --- |
| Swipe | Swipe left or right |
| Buttons | On-screen ‹ › |
| Volume | Volume up = previous, volume down = next (Android) |
| Scroll | Scroll through the chapter; swipe sideways to change chapter |

## Bookmarks

**Single-tap a paragraph** to show a small bookmark mark next to each block, then tap that mark to name it. **Bookmark** on the reading bar saves the current place. Find them under **☰ → Bookmarks**. Tap a bookmark to jump to that exact spot in the book.

## Highlights and notes

1. Long-press a word, then drag the orange handles to set the start and end.
2. The tool panel appears **above** the selection.
3. Tap **Highlight**, **Underline**, or **Font color**, then a color. Bold, italic, strike, and squiggle apply at once.
4. Tap an existing mark (including font-color text) to select the whole span, then change its color/style or **Remove**.
5. **Note** opens a blank note field. **Menu → Notes** lists only notes you wrote.

Highlight color also lives in **Display**.

## Brightness

**Menu → Display**: Auto follows the phone; Manual sets a level for LoreGuard only.

## Gestures

| Gesture | Result |
| --- | --- |
| Double-tap | Show or hide Library and Menu |
| Single-tap a paragraph | Show a bookmark mark next to each paragraph |
| Tap a paragraph bookmark mark | Name a bookmark for that paragraph |
| Single-tap a highlight or font-color span | Select the whole mark |
| Tap away from a selection | Drop the selection |
| Swipe (in Swipe mode) | Turn the page |
| Drag vertically (in Scroll mode) | Move through the chapter |
| Swipe sideways (in Scroll mode) | Previous / next chapter |
| Long-press, then drag | Select from that word; orange blips appear when you lift |
| Pinch | Change type size |

## Backup

Settings → Backup exports highlights, notes, and bookmarks as JSON. EPUB files stay on the device; export does not include the books themselves.

## Updates

Installs from GitHub use Android id `com.loreguard.app`. After 4.0.0, a newer **versionCode** replaces that LoreGuard and keeps your library. Uninstall any 3.x build first; it was a different app id.
