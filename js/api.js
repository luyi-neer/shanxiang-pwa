const WeatherAPI = {
  BASE_URL: 'https://api.open-meteo.com/v1/forecast',

  async getForecast(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      hourly: 'temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation_probability,uv_index,apparent_temperature,visibility,cloud_cover',
      daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,weathercode',
      timezone: 'Asia/Shanghai',
      forecast_days: 7
    })
    const res = await fetch(`${this.BASE_URL}?${params}`)
    if (!res.ok) throw new Error('天气数据获取失败')
    return res.json()
  },

  async getAlerts(lat, lon) {
    const key = 'd1f77c0a89064aa28c8dd7f0cee28622'
    const location = `${lon},${lat}`
    const res = await fetch(`https://devapi.qweather.com/v7/warning/now?location=${location}&key=${key}`)
    if (!res.ok) throw new Error('预警数据获取失败')
    return res.json()
  },

  async getAstroForecast(lat, lon) {
    const DEFAULT_RESULT = { seeing: 4, transparency: 4 }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const url = `http://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=astro&output=json`
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) return DEFAULT_RESULT
      const data = await res.json()
      if (!data.dataseries || !data.init) return DEFAULT_RESULT

      // 解析 init 时间，格式 "2024060812"（年月日时UTC）
      const initStr = String(data.init)
      const initYear = parseInt(initStr.slice(0, 4))
      const initMonth = parseInt(initStr.slice(4, 6)) - 1
      const initDay = parseInt(initStr.slice(6, 8))
      const initHour = parseInt(initStr.slice(8, 10))
      const initUTC = new Date(Date.UTC(initYear, initMonth, initDay, initHour))

      // 筛选夜间时段（本地时间 20:00-05:00）
      const nightPoints = data.dataseries.filter(point => {
        const pointTime = new Date(initUTC.getTime() + point.timepoint * 3600000)
        const localHour = pointTime.getHours()
        return localHour >= 20 || localHour < 5
      })

      if (nightPoints.length === 0) return DEFAULT_RESULT

      const avgSeeing = nightPoints.reduce((sum, p) => sum + p.seeing, 0) / nightPoints.length
      const avgTransparency = nightPoints.reduce((sum, p) => sum + p.transparency, 0) / nightPoints.length

      return {
        seeing: Math.round(avgSeeing),
        transparency: Math.round(avgTransparency)
      }
    } catch (e) {
      return DEFAULT_RESULT
    }
  }
}
