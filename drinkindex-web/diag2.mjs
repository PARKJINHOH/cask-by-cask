import puppeteer from 'puppeteer'
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
for (const route of ['/', '/login', '/dev/editor']) {
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('http://localhost:5174' + route, { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 2000))
  const bodyLen = await page.evaluate(() => document.body.innerText.length)
  console.log(`ROUTE ${route} :: bodyLen=${bodyLen} :: errs=${errs.slice(0,1).join('|') || 'none'}`)
  await page.close()
}
await browser.close()
