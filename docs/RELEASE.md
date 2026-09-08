# Release process

Keep these three version numbers the same before you tag a build:

| Place | Field | Example |
| --- | --- | --- |
| `package.json` | `version` | `1.1.0` |
| `src/version.ts` | `APP_VERSION` / `APP_BUILD` | `1.1.0` / `2` |
| `android/app/build.gradle` | `versionName` / `versionCode` | `1.1.0` / `2` |

`versionCode` must increase on every Play/sideload APK (integer). `versionName` is what people read.

## Checklist

1. Update the table above.
2. Add a section to `CHANGELOG.md`.
3. `npm test` and `npm run build` locally if you can.
4. Commit on `main`.
5. Tag and push:

```bash
git tag v1.1.0
git push origin main --tags
```

6. GitHub Actions **Android APK** runs tests, builds the web app, syncs Capacitor, and uploads **loreguard-debug**.
7. A tag matching `v*` also creates a GitHub Release with the APK attached.

## What not to commit

- `dist/`, `dist-apk/`, `node_modules/`
- `android/local.properties`, keystores, `.env`

The Android **application id** stays `com.epubreader.app` so existing installs upgrade in place. The visible name is LoreGuard.

## Branding files

- Source mark: `branding/loreguard.png`
- Web: `public/logo.png`, `public/apple-touch-icon.png`
- Android: `mipmap-*/ic_launcher*.png` and `drawable/splash.xml`

Regenerate icons after replacing the source PNG:

```powershell
powershell -File scripts/brand-icons.ps1
```
