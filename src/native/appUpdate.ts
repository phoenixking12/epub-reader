import { Capacitor, registerPlugin } from '@capacitor/core'

export const GITHUB_LATEST_RELEASE = 'https://api.github.com/repos/phoenixking12/epub-reader/releases/latest'

export interface LatestRelease {
  version: string
  apkUrl: string
}

interface AppUpdatePlugin {
  downloadAndInstall(options: { url: string }): Promise<void>
}

const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate')

export function versionParts(version: string): number[] {
  const clean = version.trim().replace(/^v/i, '').split('+')[0]?.split('-')[0] ?? ''
  return clean.split('.').map((part) => {
    const n = Number.parseInt(part, 10)
    return Number.isFinite(n) ? n : 0
  })
}

/** True when `latest` is a higher public version than the build that is running. */
export function isNewerVersion(latest: string, current: string): boolean {
  const next = versionParts(latest)
  const have = versionParts(current)
  const len = Math.max(next.length, have.length)
  for (let i = 0; i < len; i++) {
    const delta = (next[i] ?? 0) - (have[i] ?? 0)
    if (delta > 0) return true
    if (delta < 0) return false
  }
  return false
}

export function parseLatestRelease(payload: unknown): LatestRelease | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as { tag_name?: unknown; assets?: unknown }
  if (typeof body.tag_name !== 'string' || !Array.isArray(body.assets)) return null
  const version = body.tag_name.replace(/^v/i, '').trim()
  if (!version) return null
  const apks = body.assets.flatMap((asset) => {
    if (!asset || typeof asset !== 'object') return []
    const row = asset as { name?: unknown; browser_download_url?: unknown }
    if (typeof row.name !== 'string' || typeof row.browser_download_url !== 'string') return []
    if (!row.name.toLowerCase().endsWith('.apk')) return []
    if (!row.browser_download_url.startsWith('https://')) return []
    return [{ name: row.name, url: row.browser_download_url }]
  })
  const preferred = apks.find((item) => item.name.toLowerCase() === 'loreguard.apk') ?? apks[0]
  if (!preferred) return null
  return { version, apkUrl: preferred.url }
}

export async function installLatestRelease(currentVersion: string): Promise<'current' | 'installing'> {
  const res = await fetch(GITHUB_LATEST_RELEASE, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error('Could not reach GitHub')
  const info = parseLatestRelease(await res.json())
  if (!info) throw new Error('The latest release has no app file')
  if (!isNewerVersion(info.version, currentVersion)) return 'current'
  if (Capacitor.getPlatform() === 'android') {
    await AppUpdate.downloadAndInstall({ url: info.apkUrl })
    return 'installing'
  }
  window.location.assign(info.apkUrl)
  return 'installing'
}
