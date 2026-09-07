# EPUB Reader

Offline EPUB 2/3 reader for Android. Books, highlights, and progress stay on the phone. You do not need Android Studio or an emulator to build or install it.

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
4. In **Actions**, download **epub-reader-debug**.
5. On the phone, open the APK and allow install from that source.

For a versioned file, tag `v1.0.0` and install from **Releases**.

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
- Pages or scroll; pinch changes type size
- Day / sepia / night, fonts, brightness
- Highlight, underline, notes, bookmarks
- Library search, labels, pin
- JSON backup of notes (not the EPUB files)

## Stack

Vite, React, TypeScript, Dexie, Capacitor 7, GitHub Actions.
