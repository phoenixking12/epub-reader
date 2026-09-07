import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = 'scripts/verify-output'
mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=420,860'],
  defaultViewport: { width: 420, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
})

const page = await browser.newPage()
page.on('pageerror', (err) => console.log('PAGEERROR', err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE', msg.text())
})

const notes = []

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 2500))
  const html = await page.content()
  writeFileSync(`${outDir}/page.html`, html)
  notes.push(`title: ${await page.title()}`)
  notes.push(`body text: ${(await page.evaluate(() => document.body.innerText)).slice(0, 400)}`)
  notes.push(`classes: ${await page.evaluate(() => document.body.firstElementChild?.className || document.getElementById('root')?.firstElementChild?.className || 'none')}`)
  await page.screenshot({ path: `${outDir}/00-first.png`, fullPage: true })

  const onReader = await page.$('.reader')
  if (onReader) {
    notes.push('landed on reader (last book restore)')
    const readerBtns = await page.evaluate(() =>
      [...document.querySelectorAll('.reader .icon-btn, .reader .chip, .reader .fab')].slice(0, 8).map((el) => {
        const s = getComputedStyle(el)
        return { text: s.color, bg: s.backgroundColor, label: el.textContent?.trim() }
      }),
    )
    notes.push(`reader buttons: ${JSON.stringify(readerBtns)}`)
    await page.screenshot({ path: `${outDir}/03-reader.png` })

    const lib = await page.$('button.icon-btn')
    if (lib) {
      const firstLabel = await lib.evaluate((el) => el.textContent)
      notes.push(`top button: ${firstLabel}`)
      if (/library/i.test(firstLabel || '')) {
        await lib.click()
        await new Promise((r) => setTimeout(r, 800))
      }
    }
  }

  const h1 = await page.$('h1')
  notes.push(`h1 present: ${Boolean(h1)} ${h1 ? await h1.evaluate((el) => el.textContent) : ''}`)

  const contrast = await page.evaluate(() => {
    const btn = document.querySelector('.icon-btn, .chip, .fab')
    if (!btn) return null
    const s = getComputedStyle(btn)
    return { text: s.color, bg: s.backgroundColor, label: btn.textContent?.trim() }
  })
  notes.push(`button contrast: ${JSON.stringify(contrast)}`)

  const sorts = await page.$$eval('.lib-tools select', (els) =>
    els.map((el) => ({ label: el.getAttribute('aria-label'), value: el.value, options: [...el.options].map((o) => o.text) })),
  ).catch(() => [])
  notes.push(`library selects: ${JSON.stringify(sorts)}`)
  await page.screenshot({ path: `${outDir}/01-library.png`, fullPage: true })

  const sample = await page.evaluateHandle(() =>
    [...document.querySelectorAll('button')].find((b) => /sample/i.test(b.textContent || '')),
  )
  if (sample.asElement()) {
    await sample.asElement().click()
    notes.push('clicked Load sample book')
    await new Promise((r) => setTimeout(r, 1500))
  }

  const card = await page.$('.cover-btn')
  if (card) {
    await card.click()
    notes.push('opened book card')
    await new Promise((r) => setTimeout(r, 2500))
  }

  await page.screenshot({ path: `${outDir}/03b-reader.png` })

  await page.keyboard.down('Control')
  await page.mouse.wheel({ deltaY: -240 })
  await page.keyboard.up('Control')
  await new Promise((r) => setTimeout(r, 800))
  const badge = await page
    .$eval('.pinch-badge', (el) => ({ hidden: el.hidden, text: el.textContent }))
    .catch(() => null)
  notes.push(`ctrl+wheel badge: ${JSON.stringify(badge)}`)
  await page.screenshot({ path: `${outDir}/04-after-wheel.png` })

  writeFileSync(`${outDir}/notes.txt`, notes.join('\n'))
  console.log(notes.join('\n'))
} finally {
  await browser.close()
}
