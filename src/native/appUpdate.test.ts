import { describe, expect, it } from 'vitest'
import { isNewerVersion, parseLatestRelease } from './appUpdate'

describe('parseLatestRelease', () => {
  it('reads the LoreGuard apk from the latest GitHub release', () => {
    expect(
      parseLatestRelease({
        tag_name: 'v4.1.3',
        assets: [
          { name: 'notes.txt', browser_download_url: 'https://github.com/notes.txt' },
          {
            name: 'LoreGuard.apk',
            browser_download_url: 'https://github.com/phoenixking12/epub-reader/releases/download/v4.1.3/LoreGuard.apk',
          },
        ],
      }),
    ).toEqual({
      version: '4.1.3',
      apkUrl: 'https://github.com/phoenixking12/epub-reader/releases/download/v4.1.3/LoreGuard.apk',
    })
  })

  it('ignores a release that has no apk', () => {
    expect(parseLatestRelease({ tag_name: 'v4.1.3', assets: [] })).toBeNull()
    expect(parseLatestRelease(null)).toBeNull()
  })
})

describe('isNewerVersion', () => {
  it('treats the same version as already installed', () => {
    expect(isNewerVersion('v4.1.2', '4.1.2')).toBe(false)
    expect(isNewerVersion('4.1.3', '4.1.2')).toBe(true)
    expect(isNewerVersion('4.1.2', '4.2.0')).toBe(false)
  })
})
