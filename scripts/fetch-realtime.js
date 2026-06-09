const fs = require('fs')
const path = require('path')

const peaks = [
  '玉龙雪山','四姑娘山','贡嘎山','梅里雪山','南迦巴瓦','珠穆朗玛',
  '哈巴雪山','太白山','武功山','华山','泰山','黄山光明顶',
  '五台山','张家界','峨眉山','折多山','雀儿山','鳌山',
  '神农架','武夷山','三清山','苍山','牛心山','岗什卡'
]

const DOUYIN_SEARCH = 'https://www.douyin.com/search/'
const XHS_SEARCH = 'https://www.xiaohongshu.com/search_result?keyword='

async function fetchPeakRealtime(peakName) {
  const today = new Date().toISOString().split('T')[0]
  const items = []

  try {
    const query = encodeURIComponent(`${peakName} 天气 ${today}`)
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${peakName}+天气+今天+徒步&dateRestrict=d1&num=5`)

    if (res.ok) {
      const data = await res.json()
      if (data.items) {
        for (const item of data.items) {
          const snippet = item.snippet || ''
          const weatherKeywords = ['晴','阴','雨','雪','风','雾','温度','℃','度','冷','热','湿','干','能见度','紫外线']
          if (weatherKeywords.some(k => snippet.includes(k))) {
            items.push({
              content: snippet.slice(0, 120),
              source: item.displayLink || '网络',
              url: item.link
            })
          }
        }
      }
    }
  } catch (e) {
    // 静默跳过
  }

  return items.length > 0 ? { peak: peakName, date: new Date().toISOString().split('T')[0], items, source: '社交媒体/搜索引擎' } : null
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'realtime')
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const results = {}

  for (const peak of peaks) {
    const data = await fetchPeakRealtime(peak)
    if (data) {
      results[peak] = data
    }
    // 避免请求过快
    await new Promise(r => setTimeout(r, 1000))
  }

  // 写入单个汇总JSON
  fs.writeFileSync(
    path.join(outputDir, 'latest.json'),
    JSON.stringify({ updated: new Date().toISOString(), data: results }, null, 2)
  )

  // 每座山单独一个文件方便前端按需加载
  for (const [peak, data] of Object.entries(results)) {
    const filename = peak.replace(/[^a-zA-Z一-鿿]/g, '') + '.json'
    fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(data))
  }

  console.log(`完成: ${Object.keys(results).length}/${peaks.length} 座山峰有实况数据`)
}

main().catch(e => { console.error(e); process.exit(1) })
