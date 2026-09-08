# Release process

Keep these three version numbers the same before you tag a build:

| Place | Field | Example |
| --- | --- | --- |
| `package.json` | `version` | `3.0.2` |
| `src/version.ts` | `APP_VERSION` / `APP_BUILD` | `3.0.2` / `7` |
| `android/app/build.gradle` | `versionName` / `versionCode` | `3.0.2` / `7` |

`versionCode` must **increase** on every APK you ship (`1` → `2` → `3` …). Android uses that integer to treat the file as an update of the same app. Do not change `applicationId` (`com.epubreader.app`) or the Dexie database name (`epub-reader`), or users will get a second install and an empty library.

The visible name is **LoreGuard** (Android label, GitHub release title, APK artifact). The GitHub repo may still be `epub-reader`; rename it if you want the URL to match:

```bash
gh repo rename LoreGuard
```

Do not change the Android **application id**.

## Checklist

1. Update the table above.
2. Add a section to `CHANGELOG.md`.
3. `npm test` and `npm run build` locally if you can.
4. Commit on `main`.
5. Tag and push:

```bash
git tag v3.0.2
git push origin main --tags
```

6. GitHub Actions **LoreGuard APK** runs tests, builds, syncs Capacitor, and uploads the **LoreGuard** artifact.
7. A tag matching `v*` creates a GitHub Release named **LoreGuard v…** with `LoreGuard.apk`.

## What not to commit

- `dist/`, `dist-apk/`, `node_modules/`
- `android/local.properties`, keystores, `.env`

## Branding files

- Source mark: `branding/loreguard.png`
- Web: `public/logo.png`, `public/apple-touch-icon.png`
- Android: `mipmap-*/ic_launcher*.png` and `drawable/splash.xml`

```powershell
powershell -File scripts/brand-icons.ps1
```
