import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 420, height: 800, isMobile: true, hasTouch: true })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1200))

const sample = await page.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find((x) => /sample/i.test(x.textContent || '')),
)
if (sample.asElement()) {
  await sample.asElement().click()
  await new Promise((r) => setTimeout(r, 1200))
}
const card = await page.$('.cover-btn')
if (card) await card.click()
await new Promise((r) => setTimeout(r, 2500))

async function sizes() {
  for (const f of page.frames()) {
    try {
      const v = await f.evaluate(() => {
        const p = document.querySelector('p')
        if (!p) return null
        return {
          p: getComputedStyle(p).fontSize,
          html: getComputedStyle(document.documentElement).fontSize,
        }
      })
      if (v) return v
    } catch {
      /* cross-origin or empty */
    }
  }
  return null
}

const before = await sizes()
await page.keyboard.down('Control')
await page.mouse.wheel({ deltaY: -480 })
await page.keyboard.up('Control')
await new Promise((r) => setTimeout(r, 900))
const after = await sizes()
console.log(JSON.stringify({ before, after, frames: page.frames().length }))
await browser.close()
