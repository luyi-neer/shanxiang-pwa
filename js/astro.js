const Astro = {
  toJD(date) {
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const d = date.getDate() + date.getHours() / 24 + date.getMinutes() / 1440
    const a = Math.floor((14 - m) / 12)
    const yy = y + 4800 - a
    const mm = m + 12 * a - 3
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
  },

  getMoonPhase(date) {
    const jd = this.toJD(date)
    const daysSinceNew = (jd - 2451550.1) % 29.530588853
    const phase = daysSinceNew < 0 ? daysSinceNew + 29.530588853 : daysSinceNew
    const illumination = (1 - Math.cos(phase / 29.530588853 * 2 * Math.PI)) / 2

    let name = ''
    if (phase < 1.85) name = '新月'
    else if (phase < 7.38) name = '蛾眉月'
    else if (phase < 9.23) name = '上弦月'
    else if (phase < 13.77) name = '盈凸月'
    else if (phase < 15.62) name = '满月'
    else if (phase < 20.15) name = '亏凸月'
    else if (phase < 22.0) name = '下弦月'
    else if (phase < 27.69) name = '残月'
    else name = '新月'

    return { phase, illumination, name }
  },

  getGMST(date) {
    const jd = this.toJD(date)
    const T = (jd - 2451545.0) / 36525.0
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T
    gmst = ((gmst % 360) + 360) % 360
    return gmst
  },

  getMilkyWayCenter() {
    return { ra: 266.417, dec: -29.008 }
  },

  equatorialToHorizontal(ra, dec, lat, lon, date) {
    const gmst = this.getGMST(date)
    const lst = (gmst + lon) % 360
    const ha = ((lst - ra) % 360 + 360) % 360

    const haRad = ha * Math.PI / 180
    const decRad = dec * Math.PI / 180
    const latRad = lat * Math.PI / 180

    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
    const alt = Math.asin(sinAlt) * 180 / Math.PI

    const cosA = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(alt * Math.PI / 180))
    let az = Math.acos(Math.max(-1, Math.min(1, cosA))) * 180 / Math.PI
    if (Math.sin(haRad) > 0) az = 360 - az

    return { alt, az }
  },

  getMilkyWayVisibility(lat, lon, date) {
    const gc = this.getMilkyWayCenter()
    const tonight = new Date(date)
    tonight.setHours(19, 0, 0, 0)

    const hours = []
    for (let h = 0; h < 12; h++) {
      const t = new Date(tonight.getTime() + h * 3600000)
      const pos = this.equatorialToHorizontal(gc.ra, gc.dec, lat, lon, t)
      if (pos.alt > 10) {
        hours.push({ time: t, hour: t.getHours(), alt: pos.alt.toFixed(1), az: pos.az.toFixed(0) })
      }
    }

    let bestTime = null
    let maxAlt = 0
    for (const h of hours) {
      if (parseFloat(h.alt) > maxAlt) {
        maxAlt = parseFloat(h.alt)
        bestTime = h
      }
    }

    return { visible: hours.length > 0, hours, bestTime, maxAlt }
  },

  estimateBortle(elevation, difficulty) {
    if (elevation > 4000) return 2
    if (elevation > 3000) return 3
    if (elevation > 2000 && difficulty >= 3) return 3
    if (elevation > 2000) return 4
    if (elevation > 1500) return 4
    return 5
  },

  getStargazingScore(moonIllumination, cloudCover, milkyWayVisible, bortle) {
    let score = 100
    score -= moonIllumination * 35
    score -= (cloudCover / 100) * 40
    score -= Math.max(0, (bortle - 2)) * 5
    if (!milkyWayVisible) score -= 10
    score = Math.max(0, Math.min(100, Math.round(score)))

    let rating, ratingClass
    if (score >= 80) { rating = '极佳'; ratingClass = 'star-excellent' }
    else if (score >= 60) { rating = '良好'; ratingClass = 'star-good' }
    else if (score >= 40) { rating = '一般'; ratingClass = 'star-fair' }
    else { rating = '较差'; ratingClass = 'star-poor' }

    return { score, rating, ratingClass }
  },

  getStargazingForecast(peak, hourlyCloudCover) {
    const now = new Date()
    const moon = this.getMoonPhase(now)
    const milkyWay = this.getMilkyWayVisibility(peak.lat, peak.lon, now)
    const bortle = this.estimateBortle(peak.elevation, peak.difficulty)

    let avgCloud = 50
    if (hourlyCloudCover && hourlyCloudCover.length > 0) {
      const nightClouds = hourlyCloudCover.filter((_, i) => {
        const h = i % 24
        return h >= 20 || h <= 5
      }).slice(0, 10)
      if (nightClouds.length > 0) {
        avgCloud = nightClouds.reduce((a, b) => a + b, 0) / nightClouds.length
      }
    }

    const result = this.getStargazingScore(moon.illumination, avgCloud, milkyWay.visible, bortle)

    return { ...result, moon, milkyWay, bortle, avgCloud: Math.round(avgCloud) }
  }
}
