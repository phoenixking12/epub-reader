import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = 'scripts/verify-output'
mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
})

const page = await browser.newPage()
const notes = []
const errors = []
page.on('pageerror', (err) => errors.push(`PAGEERROR ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`CONSOLE ${msg.text()}`)
})

const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${name}.png` })
}

const clickText = async (re) => {
  const handle = await page.evaluateHandle((pattern) => {
    const rx = new RegExp(pattern, 'i')
    return [...document.querySelectorAll('button, [role="button"], label')].find((b) =>
      rx.test(b.textContent || ''),
    )
  }, re.source)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const textOf = async (sel) =>
  page
    .$eval(sel, (el) => el.innerText)
    .catch(() => '')

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 2200))
  notes.push(`start class: ${await page.evaluate(() => document.querySelector('#root')?.firstElementChild?.className)}`)
  await shot('10-start')

  if (await page.$('.reader')) {
    notes.push('restored last book')
    const opened = await clickText(/library/i)
    notes.push(`clicked library: ${opened}`)
    await new Promise((r) => setTimeout(r, 700))
  }

  if (!(await page.$('.more-btn'))) {
    notes.push('empty library, loading sample')
    await clickText(/sample/i)
    await new Promise((r) => setTimeout(r, 1400))
  }

  notes.push(`library h1: ${(await textOf('h1')).trim()}`)
  notes.push(`fab: ${await page.$eval('.fab', (el) => el.textContent?.trim()).catch(() => 'missing')}`)
  notes.push(`cards: ${await page.$$eval('.book-card', (els) => els.length)}`)
  const filters = await page.$$eval('.lib-filters select', (els) =>
    els.map((el) => ({ label: el.getAttribute('aria-label'), options: [...el.options].map((o) => o.text) })),
  )
  notes.push(`filters: ${JSON.stringify(filters)}`)
  await shot('11-library')

  const more = await page.$('.more-btn')
  if (more) {
    await more.click()
    await new Promise((r) => setTimeout(r, 300))
    const menu = await page.$$eval('.card-menu button', (els) => els.map((el) => el.textContent?.trim()))
    notes.push(`card menu: ${JSON.stringify(menu)}`)
    await shot('12-card-menu')
    await page.click('.library h1')
    await new Promise((r) => setTimeout(r, 200))
  } else {
    notes.push('still no more-btn')
  }

  await clickText(/settings/i)
  await new Promise((r) => setTimeout(r, 500))
  const settingsText = await textOf('.settings')
  notes.push(`settings headings: ${(await page.$$eval('.settings h2', (els) => els.map((el) => el.textContent))).join(' | ')}`)
  notes.push(`settings has hyphenate: ${/hyphenate/i.test(settingsText)}`)
  notes.push(`settings has backup: ${/backup/i.test(settingsText)}`)
  notes.push(`settings has wiktionary: ${/wiktionary/i.test(settingsText)}`)
  await shot('13-settings')

  await clickText(/back/i)
  await new Promise((r) => setTimeout(r, 400))

  const cover = await page.$('.cover-btn')
  if (cover) {
    await cover.click()
    await new Promise((r) => setTimeout(r, 2200))
  }
  notes.push(`reader: ${Boolean(await page.$('.reader'))}`)
  const chrome = await page.$$eval('.reader-top button', (els) => els.map((el) => el.textContent?.trim()))
  notes.push(`reader chrome: ${JSON.stringify(chrome)}`)
  await shot('14-reader')

  await clickText(/^aa$/i)
  await new Promise((r) => setTimeout(r, 400))
  const lookTabs = await page.$$eval('.sheet-tabs button', (els) => els.map((el) => el.textContent?.trim()))
  notes.push(`aa tabs: ${JSON.stringify(lookTabs)}`)
  const lookThemes = await page.$$eval('.display-sheet .chip', (els) => els.map((el) => el.textContent?.trim()))
  notes.push(`aa look chips: ${JSON.stringify(lookThemes)}`)
  await shot('15-aa-look')

  await clickText(/^page$/i)
  await new Promise((r) => setTimeout(r, 250))
  notes.push(`aa page chips: ${JSON.stringify(await page.$$eval('.display-sheet .chip', (els) => els.map((el) => el.textContent?.trim())))}`)
  await shot('16-aa-page')

  await clickText(/^more$/i)
  await new Promise((r) => setTimeout(r, 250))
  notes.push(`aa more has css: ${/extra css/i.test(await textOf('.display-sheet'))}`)
  await shot('17-aa-more')
  await clickText(/^done$/i)
  await new Promise((r) => setTimeout(r, 300))

  await clickText(/highlights/i)
  await new Promise((r) => setTimeout(r, 400))
  notes.push(`drawer tabs: ${JSON.stringify(await page.$$eval('.drawer-tabs button', (els) => els.map((el) => el.textContent?.trim())))}`)
  notes.push(`highlights empty: ${/long-press/i.test(await textOf('.drawer'))}`)
  await shot('18-highlights')

  await clickText(/^close$/i)
  await new Promise((r) => setTimeout(r, 400))
  const titleBtn = await page.$('.reader-title')
  notes.push(`title after close: ${Boolean(titleBtn)}`)
  if (titleBtn) await titleBtn.click()
  await new Promise((r) => setTimeout(r, 400))
  notes.push(`contents open: ${/contents/i.test(await textOf('.drawer-tabs'))}`)
  await shot('19-contents')
  await clickText(/^close$/i)
  await new Promise((r) => setTimeout(r, 400))

  let selected = ''
  for (const frame of page.frames()) {
    const text = await frame
      .evaluate(() => {
        const p = document.querySelector('p')
        const node = [...(p?.childNodes || [])].find((n) => n.nodeType === 3 && n.textContent?.trim())
        if (!node || !p) return ''
        const range = document.createRange()
        const len = node.textContent?.length ?? 0
        range.setStart(node, 0)
        range.setEnd(node, Math.min(24, len))
        const sel = document.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        return sel?.toString().slice(0, 90) || ''
      })
      .catch(() => '')
    if (text) {
      selected = text
      break
    }
  }
  notes.push(`iframe select: ${JSON.stringify(selected)}`)
  await new Promise((r) => setTimeout(r, 500))
  notes.push(`selection pop: ${Boolean(await page.$('.selection-pop'))}`)
  if (await page.$('.selection-pop')) {
    notes.push(
      `toolbar actions: ${JSON.stringify(await page.$$eval('.selection-pop button', (els) => els.map((el) => el.textContent?.trim()).filter(Boolean)))}`,
    )
    await shot('20-selection')
    const moreBtn = await page.$('.selection-pop [aria-expanded]')
    if (moreBtn) await moreBtn.click()
    await new Promise((r) => setTimeout(r, 200))
    notes.push(
      `more actions: ${JSON.stringify(await page.$$eval('.selection-more button', (els) => els.map((el) => el.textContent?.trim())))}`,
    )
    await shot('21-selection-more')
    const swatch = await page.$('.selection-pop .swatch')
    if (swatch) {
      await swatch.click()
      await new Promise((r) => setTimeout(r, 600))
      notes.push(`pop after highlight: ${Boolean(await page.$('.selection-pop'))}`)
      await clickText(/highlights/i)
      await new Promise((r) => setTimeout(r, 400))
      notes.push(`highlight list: ${(await textOf('.drawer')).slice(0, 240)}`)
      await shot('22-highlight-list')
    }
  } else {
    await shot('20-no-selection')
    notes.push(`frames: ${page.frames().map((f) => f.url()).join(' | ')}`)
  }

  writeFileSync(`${outDir}/ux-notes.txt`, [...notes, '', ...errors].join('\n'))
  console.log([...notes, '', ...errors].join('\n'))
} catch (err) {
  errors.push(String(err))
  await shot('99-error')
  writeFileSync(`${outDir}/ux-notes.txt`, [...notes, '', ...errors].join('\n'))
  console.log([...notes, '', ...errors].join('\n'))
  throw err
} finally {
  await browser.close()
}
