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

const WEATHER_KEYWORDS = ['晴','阴','雨','雪','风','雾','温度','℃','度','冷','热','天气','能见度','日照','云','霜','冰']

async function searchXiaohongshu(browser, peakName) {
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  const items = []
  try {
    const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(peakName + ' 天气')}&source=web_search_result_notes`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))

    const notes = await page.evaluate(() => {
      const cards = document.querySelectorAll('.note-item, [data-v-a264b01a], .feeds-page .note-item, section.note-item')
      const results = []
      cards.forEach(card => {
        const title = card.querySelector('.title, h3, [class*="title"]')?.textContent?.trim() || ''
        const desc = card.querySelector('.desc, p, [class*="desc"]')?.textContent?.trim() || ''
        const time = card.querySelector('.time, [class*="time"], [class*="date"]')?.textContent?.trim() || ''
        if (title || desc) {
          results.push({ title, desc, time })
        }
      })
      return results.slice(0, 5)
    })

    const today = new Date()
    for (const note of notes) {
      const text = note.title + ' ' + note.desc
      const hasWeather = WEATHER_KEYWORDS.some(k => text.includes(k))
      const isRecent = note.time.includes('今天') || note.time.includes('小时前') || note.time.includes('刚刚') || note.time.includes('分钟前')

      if (hasWeather && (isRecent || !note.time)) {
        items.push({
          content: (note.title + (note.desc ? '：' + note.desc : '')).slice(0, 150),
          source: '小红书'
        })
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const results = {}
  const today = new Date().toISOString().split('T')[0]

  for (const peak of peaks) {
    console.log(`正在搜索: ${peak}`)
    const items = await searchXiaohongshu(browser, peak)
    if (items.length > 0) {
      results[peak] = { peak, date: today, items, source: '小红书' }
      console.log(`  找到 ${items.length} 条`)
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
