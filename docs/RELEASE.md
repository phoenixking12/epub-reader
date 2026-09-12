# Release process

Keep these three version numbers the same before you tag a build:

| Place | Field | Example |
| --- | --- | --- |
| `package.json` | `version` | `4.0.1` |
| `src/version.ts` | `APP_VERSION` / `APP_BUILD` | `4.0.1` / `2` |
| `android/app/build.gradle` | `versionName` / `versionCode` | `4.0.1` / `2` |

`versionCode` must **increase** on every APK you ship after 4.0.0 (`1` → `2` → `3` …). Android uses that integer to treat the file as an update of the same app.

## Identity (do not change again)

These names are the LoreGuard identity from 4.0.0 onward. Changing any of them later installs a second app and an empty library:

| Place | Value |
| --- | --- |
| Android `applicationId` / Capacitor `appId` | `com.loreguard.app` |
| Android `namespace` | `com.loreguard.app` |
| Dexie database | `loreguard` |
| Home-screen shortcut scheme | `loreguard://book/…` |
| Visible name / APK | **LoreGuard** |

The GitHub repo may still be `epub-reader`; rename it if you want the URL to match:

```bash
gh repo rename LoreGuard
```

4.0.0 is a **new Android app**. Uninstall any 3.x `com.epubreader.app` build first; books do not carry over.

## Checklist

1. Update the table above.
2. Add a section to `CHANGELOG.md`.
3. `npm test` and `npm run build` locally if you can.
4. Commit on `main`.
5. Tag and push:

```bash
git tag v4.0.1
git push origin main --tags
```

6. GitHub Actions **LoreGuard APK** runs tests, builds, syncs Capacitor, and uploads the **LoreGuard** artifact. Pushing `main` only stores that artifact on the workflow run.
7. A tag matching `v*` creates a GitHub Release named **LoreGuard v…** with `LoreGuard.apk`. Without the tag, phones installing from **Releases** still get the previous version.

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
