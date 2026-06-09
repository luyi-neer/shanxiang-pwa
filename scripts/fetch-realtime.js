const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const peaks = [
  '玉龙雪山','四姑娘山','贡嘎山','梅里雪山','南迦巴瓦',
  '哈巴雪山','太白山','武功山','华山','泰山',
  '黄山','五台山','张家界','峨眉山','折多山',
  '雀儿山','鳌山','神农架','武夷山','苍山',
  '牛心山','岗什卡','小五台','海坨山'
]

const WEATHER_KEYWORDS = ['晴','阴','雨','雪','风','雾','温度','℃','度','冷','热','天气','能见度','日照','云','霜','冰','湿','干','紫外']

async function searchDouyin(browser, peakName) {
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.setViewport({ width: 1280, height: 800 })

  const items = []
  try {
    const url = `https://www.douyin.com/search/${encodeURIComponent(peakName + ' 天气')}?type=video`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))

    const notes = await page.evaluate(() => {
      const results = []
      const cards = document.querySelectorAll('[class*="video-card"], [class*="search-result"], li[class*="item"], div[class*="PlayerContainer"], a[href*="/video/"]')
      cards.forEach(card => {
        const titleEl = card.querySelector('[class*="title"], [class*="desc"], p, span')
        const title = titleEl?.textContent?.trim() || ''
        const parent = card.closest('[class*="item"]') || card.parentElement
        const extra = parent?.querySelector('[class*="extra"], [class*="info"], [class*="author"]')?.textContent?.trim() || ''
        if (title.length > 5) {
          results.push({ title: title.slice(0, 150), extra })
        }
      })
      return results.slice(0, 8)
    })

    for (const note of notes) {
      const text = note.title + ' ' + note.extra
      const hasWeather = WEATHER_KEYWORDS.some(k => text.includes(k))
      if (hasWeather) {
        items.push({
          content: note.title,
          source: '抖音'
        })
      }
    }

    if (items.length === 0) {
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 5000))
      const lines = pageText.split('\n').filter(l => l.length > 10 && l.length < 200)
      for (const line of lines) {
        const hasWeather = WEATHER_KEYWORDS.some(k => line.includes(k))
        const hasPeak = line.includes(peakName) || line.includes('天气')
        if (hasWeather && hasPeak) {
          items.push({ content: line.trim().slice(0, 150), source: '抖音' })
          if (items.length >= 3) break
        }
      }
    }
  } catch (e) {
    console.log(`  跳过 ${peakName}: ${e.message}`)
  } finally {
    await page.close()
  }

  return items
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'realtime')
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  const results = {}
  const today = new Date().toISOString().split('T')[0]

  for (const peak of peaks) {
    console.log(`正在搜索: ${peak}`)
    const items = await searchDouyin(browser, peak)
    if (items.length > 0) {
      results[peak] = { peak, date: today, items, source: '抖音' }
      console.log(`  找到 ${items.length} 条`)
    } else {
      console.log(`  无数据`)
    }
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000))
  }

  await browser.close()

  fs.writeFileSync(
    path.join(outputDir, 'latest.json'),
    JSON.stringify({ updated: new Date().toISOString(), data: results }, null, 2)
  )

  console.log(`\n完成: ${Object.keys(results).length}/${peaks.length} 座山峰有实况数据`)
}

main().catch(e => { console.error(e); process.exit(1) })
