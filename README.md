# LoreGuard

Offline EPUB 2/3 reader for Android. Books, highlights, bookmarks, and progress stay on the phone.

**Version:** 3.0.2 (build 7)

## Add books on Android

Tap **+ Add**, then:

- **Choose files** — pick one or more EPUBs from Downloads, Drive, or a file manager
- **Choose folder** — pick a folder; every `.epub` in it (including subfolders) is copied into the app

After the copy, reading does not need that folder, USB storage, or the internet. You can also open an EPUB from another app with **Share** / **Open with**.

On a computer, **Choose folder** uses the browser’s directory picker.

## Offline

These work with airplane mode on:

- Opening and turning pages
- Fonts, themes, pinch-to-size
- Highlights, notes, bookmarks
- In-book search
- The bundled sample book

These need a connection:

- Wiktionary / Google / DuckDuckGo from a selection
- Sharing a file to another app that uploads it

## Install the APK (no Android Studio)

1. Open this repo on GitHub.
2. **Settings → Actions → General → Workflow permissions → Read and write**.
3. Push to `main` (or run the **Android APK** workflow).
4. In **Actions**, download **LoreGuard**.
5. On the phone, open the APK and allow install from that source. If LoreGuard is already installed, this replaces it and keeps your books.

For a versioned file, tag `v3.0.2` and install from **Releases**. See [docs/RELEASE.md](docs/RELEASE.md).

## Using the reader

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for bookmarks, notes, selection, and brightness.

## Develop on a PC

```bash
npm install
npm test
npm run dev
```

```bash
npm run build
npx cap sync android
```

The second pair is what GitHub Actions runs before `assembleDebug`. Do not start an Android emulator on a low-RAM PC.

## Features

- EPUB 2/3 via foliate-js: spine, TOC, publisher CSS, CFI progress
- Pages via swipe, on-screen buttons, volume keys, or chapter scroll
- Day / sepia / night, fonts, auto or manual brightness
- Paragraph bookmarks with names, highlights, notes
- Library search, labels, pin
- JSON backup of notes (not the EPUB files)

## Stack

Vite, React, TypeScript, Dexie, Capacitor 7, GitHub Actions.

## Versioning

App version lives in `src/version.ts`, `package.json`, and `android/app/build.gradle`. Keep those three in sync. Changelog: [CHANGELOG.md](CHANGELOG.md).
