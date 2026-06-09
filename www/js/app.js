const App = {
  $app: document.getElementById('app'),
  currentRoute: '',

  init() {
    window.addEventListener('hashchange', () => this.route())
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
      })
    })
    this.route()
  },

  route() {
    const hash = location.hash || '#/'
    if (hash.startsWith('#/peak/')) {
      this.showDetail(hash.replace('#/peak/', ''))
    } else if (hash === '#/alerts') {
      this.showAlerts()
      this.setActiveTab('/alerts')
    } else if (hash === '#/mine') {
      this.showMine()
      this.setActiveTab('/mine')
    } else {
      this.showList()
      this.setActiveTab('/')
    }
  },

  setActiveTab(route) {
    document.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.route === route)
    })
  },

  getFavorites() {
    try { return JSON.parse(localStorage.getItem('sx_favorites') || '[]') }
    catch { return [] }
  },

  toggleFavorite(peakId) {
    const favs = this.getFavorites()
    const idx = favs.indexOf(peakId)
    if (idx >= 0) favs.splice(idx, 1)
    else favs.push(peakId)
    localStorage.setItem('sx_favorites', JSON.stringify(favs))
  },

  showList() {
    let selectedProvince = ''
    let selectedDifficulty = 0
    let sortBy = 'default'
    const provinces = [...new Set(peaks.map(p => p.province))].sort()

    const render = () => {
      const favs = this.getFavorites()
      let filtered = peaks
      if (selectedProvince) filtered = filtered.filter(p => p.province === selectedProvince)
      if (selectedDifficulty) filtered = filtered.filter(p => p.difficulty === selectedDifficulty)

      filtered = [...filtered].sort((a, b) => {
        const aFav = favs.includes(a.id) ? 0 : 1
        const bFav = favs.includes(b.id) ? 0 : 1
        if (aFav !== bFav) return aFav - bFav
        if (sortBy === 'elevation') return b.elevation - a.elevation
        if (sortBy === 'difficulty') return b.difficulty - a.difficulty
        return 0
      })

      this.$app.innerHTML = `
        <div class="page-header">
          <h1>山象</h1>
          <p>${peaks.length} 座山峰 · 天气预警</p>
        </div>
        <div class="pull-hint" id="pull-hint">↓ 下拉刷新</div>
        <div class="filter-bar">
          <div class="custom-select" id="province-select">
            <div class="select-trigger">${selectedProvince || '全部省份'} <span class="select-arrow">▾</span></div>
            <div class="select-options">
              <input class="select-search" placeholder="搜索省份..." id="province-search" />
              <div class="select-option ${!selectedProvince ? 'selected' : ''}" data-val="">全部省份</div>
              ${provinces.map(p => `<div class="select-option ${p === selectedProvince ? 'selected' : ''}" data-val="${p}">${p}</div>`).join('')}
            </div>
          </div>
          <div class="custom-select" id="sort-select">
            <div class="select-trigger">${sortBy === 'default' ? '默认排序' : sortBy === 'elevation' ? '海拔↓' : '难度↓'} <span class="select-arrow">▾</span></div>
            <div class="select-options">
              <div class="select-option ${sortBy === 'default' ? 'selected' : ''}" data-val="default">默认排序</div>
              <div class="select-option ${sortBy === 'elevation' ? 'selected' : ''}" data-val="elevation">海拔↓</div>
              <div class="select-option ${sortBy === 'difficulty' ? 'selected' : ''}" data-val="difficulty">难度↓</div>
            </div>
          </div>
        </div>
        <div class="filter-bar">
          ${[0,1,2,3,4,5].map(d => `<span class="filter-chip ${d === selectedDifficulty ? 'active' : ''}" data-diff="${d}">${d === 0 ? '全部' : '★'.repeat(d)}</span>`).join('')}
        </div>
        <div class="peak-list">
          ${filtered.map(p => {
            const isFav = favs.includes(p.id)
            return `
            <div class="peak-card" data-id="${p.id}">
              <div class="peak-info">
                <h3>${isFav ? '<span class="fav-star">♥</span> ' : ''}${p.name}</h3>
                <div class="peak-meta">
                  <span>${p.elevation}m</span>
                  <span>${p.province}</span>
                  <span>${p.regionTag}</span>
                </div>
              </div>
              <div class="peak-actions">
                <span class="fav-btn ${isFav ? 'fav-active' : ''}" data-fav="${p.id}">♥</span>
                <span class="difficulty-badge diff-${p.difficulty}">★${p.difficulty}</span>
              </div>
            </div>`
          }).join('')}
        </div>
        ${filtered.length === 0 ? '<div class="empty-state"><div class="icon">🔍</div><p>无匹配山峰</p></div>' : ''}
      `

    }

    render()

    this.$app.addEventListener('click', (e) => {
      const trigger = e.target.closest('.select-trigger')
      if (trigger) {
        e.stopPropagation()
        const sel = trigger.closest('.custom-select')
        const options = sel.querySelector('.select-options')
        this.$app.querySelectorAll('.select-options.open').forEach(o => { if (o !== options) o.classList.remove('open') })
        options.classList.toggle('open')
        const search = sel.querySelector('.select-search')
        if (search && options.classList.contains('open')) setTimeout(() => search.focus(), 50)
        return
      }
      const opt = e.target.closest('.select-option')
      if (opt) {
        e.stopPropagation()
        const sel = opt.closest('.custom-select')
        sel.querySelector('.select-options').classList.remove('open')
        if (sel.id === 'province-select') { selectedProvince = opt.dataset.val; render() }
        else if (sel.id === 'sort-select') { sortBy = opt.dataset.val; render() }
        return
      }
      if (e.target.closest('.select-search')) { e.stopPropagation(); return }
      const chip = e.target.closest('.filter-chip')
      if (chip) { selectedDifficulty = parseInt(chip.dataset.diff); render(); return }
      const fav = e.target.closest('.fav-btn')
      if (fav) { e.stopPropagation(); this.toggleFavorite(fav.dataset.fav); render(); return }
      const card = e.target.closest('.peak-card')
      if (card) { location.hash = `#/peak/${card.dataset.id}`; return }
      this.$app.querySelectorAll('.select-options.open').forEach(o => o.classList.remove('open'))
    })

    this.$app.addEventListener('input', (e) => {
      if (e.target.classList.contains('select-search')) {
        const q = e.target.value.toLowerCase()
        const sel = e.target.closest('.custom-select')
        sel.querySelectorAll('.select-option').forEach(opt => {
          opt.style.display = opt.textContent.toLowerCase().includes(q) ? '' : 'none'
        })
      }
    })

    this.initPullRefresh(render)
  },

  initPullRefresh(refreshFn) {
    const app = this.$app
    let startY = 0, pulling = false

    const onStart = e => {
      const hint = document.getElementById('pull-hint')
      if (!hint) return
      if (app.scrollTop === 0 || window.scrollY === 0) {
        startY = e.touches[0].clientY
        pulling = true
      }
    }

    const onMove = e => {
      if (!pulling) return
      const hint = document.getElementById('pull-hint')
      if (!hint) { pulling = false; return }
      const dy = e.touches[0].clientY - startY
      if (dy > 10 && dy < 120) {
        hint.style.opacity = Math.min(dy / 60, 1)
        hint.style.transform = `translateY(${Math.min(dy / 2, 30)}px)`
      }
    }

    const onEnd = () => {
      if (!pulling) return
      pulling = false
      const hint = document.getElementById('pull-hint')
      if (!hint) return
      const opacity = parseFloat(hint.style.opacity || 0)
      if (opacity >= 1) {
        hint.textContent = '刷新中...'
        hint.style.opacity = 1
        setTimeout(() => {
          refreshFn()
        }, 500)
      } else {
        hint.style.opacity = 0
        hint.style.transform = ''
      }
    }

    app.addEventListener('touchstart', onStart, { passive: true })
    app.addEventListener('touchmove', onMove, { passive: true })
    app.addEventListener('touchend', onEnd, { passive: true })
  },

  initSwipeBack() {
    let startX = 0, startY = 0, swiping = false
    const app = this.$app

    app.addEventListener('touchstart', e => {
      const x = e.touches[0].clientX
      if (x < 40) {
        startX = x
        startY = e.touches[0].clientY
        swiping = true
      }
    }, { passive: true })

    app.addEventListener('touchmove', e => {
      if (!swiping) return
      const dx = e.touches[0].clientX - startX
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (dy > dx) swiping = false
    }, { passive: true })

    app.addEventListener('touchend', e => {
      if (!swiping) return
      swiping = false
      const endX = e.changedTouches[0].clientX
      if (endX - startX > 80) {
        location.hash = '#/'
      }
    }, { passive: true })
  },

  async showDetail(peakId) {
    const peak = peaks.find(p => p.id === peakId)
    if (!peak) { location.hash = '#/'; return }

    this.$app.innerHTML = `
      <div class="detail-header">
        <div class="back-btn" id="back-btn">← 返回</div>
        <h1>${peak.name}</h1>
        <div class="elevation">${peak.elevation}<small>m</small></div>
        <div class="detail-tags">
          <span>${peak.province}</span>
          <span>${peak.regionTag}</span>
          <span>难度 ${'★'.repeat(peak.difficulty)}</span>
        </div>
        ${peak.quote ? `<div class="mountain-quote">"${peak.quote}"</div>` : ''}
      </div>
      <div id="realtime-container"></div>
      <div class="skeleton-wrap">
        <div class="skeleton-block skeleton-lg"></div>
        <div class="skeleton-block skeleton-md"></div>
        <div class="skeleton-block skeleton-sm"></div>
      </div>
      <div class="loading">加载天气数据中...</div>
    `

    document.getElementById('back-btn').addEventListener('click', () => { location.hash = '#/' })

    this.initSwipeBack()
    this.loadRealtime(peak)

    try {
      const data = await WeatherAPI.getForecast(peak.lat, peak.lon)
      this.renderWeather(data, peak)
    } catch (e) {
      this.$app.querySelector('.loading').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>天气数据加载失败</p></div>`
    }
  },

  renderWeather(data, peak) {
    const h = data.hourly
    const d = data.daily
    const now = new Date()
    const currentHourIdx = h.time.findIndex(t => new Date(t) >= now) || 0

    const current = {
      temp: h.temperature_2m[currentHourIdx],
      feels: h.apparent_temperature[currentHourIdx],
      wind: h.wind_speed_10m[currentHourIdx],
      gust: h.wind_gusts_10m[currentHourIdx],
      precip: h.precipitation_probability[currentHourIdx],
      uv: h.uv_index[currentHourIdx],
      vis: h.visibility[currentHourIdx]
    }

    const weatherDesc = code => {
      const map = {0:'晴',1:'少云',2:'多云',3:'阴',45:'雾',48:'雾凇',51:'小毛毛雨',53:'毛毛雨',55:'密毛毛雨',61:'小雨',63:'中雨',65:'大雨',71:'小雪',73:'中雪',75:'大雪',77:'雪粒',80:'阵雨',81:'中阵雨',82:'大阵雨',85:'小阵雪',86:'大阵雪',95:'雷暴',96:'雷暴+冰雹',99:'强雷暴+冰雹'}
      return map[code] || '未知'
    }

    const weatherIcon = code => {
      if (code === 0) return '☀️'
      if (code <= 2) return '⛅'
      if (code === 3) return '☁️'
      if (code <= 48) return '🌫️'
      if (code <= 55) return '🌦️'
      if (code <= 65) return '🌧️'
      if (code <= 77) return '❄️'
      if (code <= 82) return '🌧️'
      if (code <= 86) return '🌨️'
      return '⛈️'
    }

    const hourlyHtml = h.time.slice(currentHourIdx, currentHourIdx + 24).map((t, i) => {
      const idx = currentHourIdx + i
      const hour = new Date(t).getHours()
      const precip = h.precipitation_probability[idx]
      const cloud = h.cloud_cover ? h.cloud_cover[idx] : 0
      const isNight = hour >= 19 || hour <= 5
      const isNow = i === 0

      let hourClass = 'hour-clear'
      let hourIcon = isNight ? '🌙' : '☀️'
      if (precip > 60) { hourClass = 'hour-rain'; hourIcon = '🌧️' }
      else if (precip > 30) { hourClass = 'hour-drizzle'; hourIcon = '🌦️' }
      else if (cloud > 70) { hourClass = 'hour-cloudy'; hourIcon = isNight ? '☁️' : '⛅' }
      else if (cloud > 40) { hourClass = 'hour-partcloud'; hourIcon = isNight ? '🌙' : '⛅' }

      return `<div class="hour-card ${hourClass} ${isNow ? 'hour-now' : ''}">
        <div class="time">${isNow ? '现在' : hour + ':00'}</div>
        <div class="hour-icon">${hourIcon}</div>
        <div class="temp">${h.temperature_2m[idx]}°</div>
        <div class="hour-precip">${precip}%💧</div>
      </div>`
    }).join('')

    const weekdays = ['周日','周一','周二','周三','周四','周五','周六']
    const allMax = Math.max(...d.temperature_2m_max)
    const allMin = Math.min(...d.temperature_2m_min)
    const tempRange = allMax - allMin || 1

    const dailyHtml = d.time.map((t, i) => {
      const date = new Date(t)
      const code = d.weathercode?.[i] ?? 0
      const mm = date.getMonth() + 1
      const dd = date.getDate()
      const highPct = ((d.temperature_2m_max[i] - allMin) / tempRange * 100).toFixed(0)
      const lowPct = ((d.temperature_2m_min[i] - allMin) / tempRange * 100).toFixed(0)
      return `<div class="daily-item" data-day="${i}">
        <div class="daily-main">
          <span class="day-icon">${weatherIcon(code)}</span>
          <span class="day">${i === 0 ? '今天' : weekdays[date.getDay()]}</span>
          <span class="day-date">${mm}/${dd}</span>
          <span class="day-desc">${weatherDesc(code)}</span>
          <span class="temps">
            <span class="low">${d.temperature_2m_min[i]}°</span>
            <span class="temp-bar"><span class="temp-bar-fill" style="left:${lowPct}%;right:${100 - highPct}%"></span></span>
            <span class="high">${d.temperature_2m_max[i]}°</span>
          </span>
          <span class="day-expand">▾</span>
        </div>
        <div class="daily-detail" id="detail-day-${i}" style="display:none">
          <div class="detail-grid">
            <div class="detail-cell"><span class="detail-val">${d.precipitation_probability_max?.[i] ?? '-'}%</span><span class="detail-lbl">降水概率</span></div>
            <div class="detail-cell"><span class="detail-val">${d.wind_speed_10m_max?.[i] ?? '-'}km/h</span><span class="detail-lbl">最大风速</span></div>
            <div class="detail-cell"><span class="detail-val">${d.wind_gusts_10m_max?.[i] ?? '-'}km/h</span><span class="detail-lbl">阵风</span></div>
            <div class="detail-cell"><span class="detail-val">${d.uv_index_max?.[i] ?? '-'}</span><span class="detail-lbl">紫外线</span></div>
            <div class="detail-cell"><span class="detail-val">${d.sunrise?.[i]?.slice(11) || '-'}</span><span class="detail-lbl">日出</span></div>
            <div class="detail-cell"><span class="detail-val">${d.sunset?.[i]?.slice(11) || '-'}</span><span class="detail-lbl">日落</span></div>
          </div>
        </div>
      </div>`
    }).join('')

    const loadingEl = this.$app.querySelector('.skeleton-wrap')
    const loadingText = this.$app.querySelector('.loading')
    if (loadingEl) loadingEl.remove()
    if (loadingText) {
      loadingText.outerHTML = `
        <div class="section-title"><span class="section-icon">📍</span>当前天气</div>
        <div class="weather-now">
          <div class="now-main">
            <div class="now-temp">${current.temp}<small>°C</small></div>
            <div class="now-desc">体感 ${current.feels}°C</div>
          </div>
          <div class="now-grid">
            <div class="item"><div class="value">${current.wind}<small>km/h</small></div><div class="label">风速</div></div>
            <div class="item"><div class="value">${current.gust}<small>km/h</small></div><div class="label">阵风</div></div>
            <div class="item"><div class="value">${current.precip}<small>%</small></div><div class="label">降水</div></div>
            <div class="item"><div class="value">${current.uv}</div><div class="label">紫外线</div></div>
            <div class="item"><div class="value">${(current.vis/1000).toFixed(1)}<small>km</small></div><div class="label">能见度</div></div>
          </div>
        </div>
        <div class="section-title"><span class="section-icon">⏱️</span>逐小时</div>
        <div class="hourly-scroll">${hourlyHtml}</div>
        <div class="section-title"><span class="section-icon">📅</span>7日预报 <span class="section-hint">点击展开详情</span></div>
        <div class="daily-list">${dailyHtml}</div>
        <div id="stargazing-container"></div>
      `
    }

    this.$app.querySelectorAll('.daily-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = item.dataset.day
        const detail = document.getElementById(`detail-day-${idx}`)
        const expand = item.querySelector('.day-expand')
        if (detail.style.display === 'none') {
          detail.style.display = 'block'
          expand.textContent = '▴'
          item.classList.add('expanded')
        } else {
          detail.style.display = 'none'
          expand.textContent = '▾'
          item.classList.remove('expanded')
        }
      })
    })

    this.renderStargazing(peak, h.cloud_cover || [])
  },

  renderStargazing(peak, cloudCover) {
    const container = document.getElementById('stargazing-container')
    if (!container) return
    if (typeof Astro === 'undefined') { container.innerHTML = '<div class="empty-state"><p>星空模块未加载</p></div>'; return }

    try {
      const forecast = Astro.getStargazingForecast(peak, cloudCover)
    const mw = forecast.milkyWay
    const moon = forecast.moon

    let mwHtml = ''
    if (mw.visible && mw.bestTime) {
      const startH = mw.hours[0].hour
      const endH = mw.hours[mw.hours.length - 1].hour
      mwHtml = `
        <div class="star-item">
          <span class="star-label">银河可见</span>
          <span class="star-val">${startH}:00 - ${endH > startH ? endH : endH + 24}:00</span>
        </div>
        <div class="star-item">
          <span class="star-label">最佳时刻</span>
          <span class="star-val">${mw.bestTime.hour}:00 · 高度${mw.maxAlt.toFixed(0)}° · 方位${mw.bestTime.az}°</span>
        </div>
      `
    } else {
      mwHtml = `<div class="star-item"><span class="star-label">银河</span><span class="star-val">今晚不可见</span></div>`
    }

    container.innerHTML = `
      <div class="section-title"><span class="section-icon">🌌</span>今晚星空预测</div>
      <div class="stargazing-card ${forecast.ratingClass}">
        <div class="star-score-row">
          <div class="star-score">${forecast.score}</div>
          <div class="star-rating">${forecast.rating}</div>
        </div>
        <div class="star-details">
          <div class="star-item">
            <span class="star-label">月相</span>
            <span class="star-val">${moon.name} · 亮度${(moon.illumination * 100).toFixed(0)}%</span>
          </div>
          <div class="star-item">
            <span class="star-label">夜间云量</span>
            <span class="star-val">${forecast.avgCloud}%</span>
          </div>
          <div class="star-item">
            <span class="star-label">光污染</span>
            <span class="star-val">Bortle ${forecast.bortle} 级</span>
          </div>
          ${mwHtml}
        </div>
        <div class="star-tip">${this.getStarTip(forecast)}</div>
      </div>
    `
    } catch(e) {
      container.innerHTML = `<div class="section-title"><span class="section-icon">🌌</span>今晚星空预测</div><div class="empty-state"><p>星空数据计算异常</p></div>`
    }
  },

  getStarTip(forecast) {
    if (forecast.score >= 80) return '绝佳观星夜，银河肉眼可见，适合深空摄影'
    if (forecast.score >= 60) return '适合观星，可拍摄亮星和行星，银河较清晰'
    if (forecast.score >= 40) return '勉强可观星，月光或云量较大，建议避开月亮方向'
    return '不建议观星，云量过大或月光强烈，等待更好时机'
  },

  async loadRealtime(peak) {
    const container = document.getElementById('realtime-container')
    if (!container) return
    const key = 'd1f77c0a89064aa28c8dd7f0cee28622'
    const loc = `${peak.lon.toFixed(2)},${peak.lat.toFixed(2)}`
    try {
      const [nowRes, idxRes] = await Promise.all([
        fetch(`https://devapi.qweather.com/v7/weather/now?location=${loc}&key=${key}`),
        fetch(`https://devapi.qweather.com/v7/indices/1d?type=1,2,3,5&location=${loc}&key=${key}`)
      ])
      const nowData = await nowRes.json()
      const idxData = await idxRes.json()

      if (nowData.code !== '200') return

      const w = nowData.now
      const items = [
        `实时：${w.text}，体感 ${w.feelsLike}°C，${w.windDir} ${w.windScale}级`,
        `湿度 ${w.humidity}%，能见度 ${w.vis}km，气压 ${w.pressure}hPa`
      ]

      if (idxData.code === '200' && idxData.daily) {
        for (const idx of idxData.daily) {
          items.push(`${idx.name}：${idx.text}`)
        }
      }

      container.innerHTML = `
        <div class="realtime-section">
          <div class="section-label">实时天气 · ${w.obsTime ? new Date(w.obsTime).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) : '刚刚'}更新</div>
          ${items.map(item => `<div class="realtime-item">${item}</div>`).join('')}
          <div class="realtime-source">数据来源：和风天气</div>
        </div>
      `
    } catch (e) {}
  },

  showMine() {
    const favs = this.getFavorites()
    const favPeaks = peaks.filter(p => favs.includes(p.id))

    this.$app.innerHTML = `
      <div class="page-header">
        <h1>我的</h1>
        <p>收藏了 ${favPeaks.length} 座山峰</p>
      </div>
      <div class="section-title"><span class="section-icon">♥</span>我的收藏</div>
      ${favPeaks.length > 0 ? `<div class="peak-list">
        ${favPeaks.map(p => `
          <div class="peak-card" data-id="${p.id}">
            <div class="peak-info">
              <h3>${p.name}</h3>
              <div class="peak-meta">
                <span>${p.elevation}m</span>
                <span>${p.province}</span>
                <span>${p.regionTag}</span>
              </div>
            </div>
            <div class="peak-actions">
              <span class="fav-btn fav-active" data-fav="${p.id}">♥</span>
              <span class="difficulty-badge diff-${p.difficulty}">★${p.difficulty}</span>
            </div>
          </div>
        `).join('')}
      </div>` : '<div class="empty-state"><div class="icon">💡</div><p>还没有收藏山峰<br>在山峰列表点击 ♥ 收藏</p></div>'}
      <div class="section-title" style="margin-top:30px"><span class="section-icon">⚙️</span>设置</div>
      <div class="mine-actions">
        <div class="mine-btn" id="clear-cache-btn">清除缓存并刷新</div>
      </div>
    `

    this.$app.querySelectorAll('.peak-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = `#/peak/${card.dataset.id}` })
    })

    this.$app.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleFavorite(btn.dataset.fav)
        this.showMine()
      })
    })

    document.getElementById('clear-cache-btn').addEventListener('click', () => {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => location.reload())
      } else {
        location.reload()
      }
    })
  },

  async showAlerts() {
    this.$app.innerHTML = `
      <div class="page-header">
        <h1>灾害预警</h1>
        <p>选择山峰查看预警信息</p>
      </div>
      <div class="filter-bar">
        <select class="province-select" id="alert-peak-select">
          <option value="">选择山峰</option>
          ${peaks.map(p => `<option value="${p.id}">${p.name} (${p.province})</option>`).join('')}
        </select>
      </div>
      <div id="alert-content">
        <div class="empty-state"><div class="icon">🛡️</div><p>选择山峰查看预警</p></div>
      </div>
    `

    document.getElementById('alert-peak-select').addEventListener('change', async (e) => {
      const peakId = e.target.value
      if (!peakId) return
      const peak = peaks.find(p => p.id === peakId)
      const container = document.getElementById('alert-content')
      container.innerHTML = '<div class="loading">知天时，择良日，山野自有同行人</div>'

      try {
        const data = await WeatherAPI.getAlerts(peak.lat, peak.lon)
        if (data.code === '200' && data.warning && data.warning.length > 0) {
          container.innerHTML = data.warning.map(w => {
            const level = w.level || ''
            let cls = 'alert-blue'
            if (level.includes('黄')) cls = 'alert-yellow'
            if (level.includes('橙')) cls = 'alert-orange'
            if (level.includes('红')) cls = 'alert-red'
            return `<div class="alert-card ${cls}">
              <h3>${w.typeName || w.title || '预警'} ${level}</h3>
              <p>${w.text || ''}</p>
              <div class="alert-time">${w.pubTime || ''}</div>
            </div>`
          }).join('')
        } else {
          container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>当前无预警信息</p></div>'
        }
      } catch (e) {
        container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>预警查询失败</p></div>'
      }
    })
  }
}

App.init()
