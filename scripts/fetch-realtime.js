const fs = require('fs')
const path = require('path')

const peaks = [
  '玉龙雪山','四姑娘山','贡嘎山','梅里雪山','南迦巴瓦',
  '哈巴雪山','太白山','武功山','华山','泰山',
  '黄山','五台山','张家界','峨眉山','折多山',
  '雀儿山','鳌山','神农架','武夷山','苍山',
  '牛心山','岗什卡','小五台','海坨山'
]

const WEATHER_KEYWORDS = ['晴','阴','雨','雪','风','雾','温度','℃','度','冷','热','天气','能见度','日照','云','霜','冰','湿','干','紫外','大雾','暴雨','冰雹','雷','多云']

async function searchWeibo(peakName) {
  const query = encodeURIComponent(peakName + ' 天气')
  const url = `https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D1%26q%3D${query}&page_type=searchall`

  const items = []
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://m.weibo.cn/search?containerid=100103type%3D1%26q%3D' + query
      }
    })

    if (!res.ok) {
      console.log(`  HTTP ${res.status}`)
      return items
    }

    const json = await res.json()
    const cards = json?.data?.cards || []

    for (const card of cards) {
      const mblogList = card.card_group || (card.mblog ? [card] : [])
      for (const item of mblogList) {
        const mblog = item.mblog || item
        if (!mblog || !mblog.text) continue

        const text = mblog.text.replace(/<[^>]+>/g, '').trim()
        const hasWeather = WEATHER_KEYWORDS.some(k => text.includes(k))
        const hasPeak = text.includes(peakName) || text.includes('天气')

        if (hasWeather && hasPeak && text.length > 10) {
          const createdAt = mblog.created_at || ''
          items.push({
            content: text.slice(0, 200),
            source: '微博',
            author: mblog.user?.screen_name || '',
            time: createdAt
          })
        }
        if (items.length >= 5) break
      }
      if (items.length >= 5) break
    }
  } catch (e) {
    console.log(`  错误: ${e.message}`)
  }

  return items
}

function isToday(timeStr) {
  if (!timeStr) return true
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (timeStr.includes('分钟前') || timeStr.includes('小时前')) return true
  if (timeStr.includes('今天')) return true

  if (/^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
    return timeStr.startsWith(today)
  }

  const match = timeStr.match(/(\d+)月(\d+)日/)
  if (match) {
    const m = parseInt(match[1])
    const d = parseInt(match[2])
    return m === (now.getMonth() + 1) && d === now.getDate()
  }

  return false
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'realtime')
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const results = {}
  const today = new Date().toISOString().split('T')[0]

  for (const peak of peaks) {
    console.log(`正在搜索: ${peak}`)
    const items = await searchWeibo(peak)

    const todayItems = items.filter(item => isToday(item.time))

    if (todayItems.length > 0) {
      results[peak] = {
        peak,
        date: today,
        items: todayItems.map(({ content, source, author }) => ({ content, source, author })),
        source: '微博'
      }
      console.log(`  找到 ${todayItems.length} 条今日数据`)
    } else if (items.length > 0) {
      console.log(`  找到 ${items.length} 条但非今日`)
    } else {
      console.log(`  无数据`)
    }

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000))
  }

  fs.writeFileSync(
    path.join(outputDir, 'latest.json'),
    JSON.stringify({ updated: new Date().toISOString(), data: results }, null, 2)
  )

  console.log(`\n完成: ${Object.keys(results).length}/${peaks.length} 座山峰有实况数据`)
}

main().catch(e => { console.error(e); process.exit(1) })
