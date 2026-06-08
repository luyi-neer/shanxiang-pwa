const WeatherAPI = {
  BASE_URL: 'https://api.open-meteo.com/v1/forecast',

  async getForecast(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      hourly: 'temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation_probability,uv_index,apparent_temperature,visibility',
      daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
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
  }
}
