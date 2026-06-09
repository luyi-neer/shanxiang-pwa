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

  showList() {
    let selectedProvince = ''
    let selectedDifficulty = 0
    const provinces = [...new Set(peaks.map(p => p.province))].sort()

    const render = () => {
      let filtered = peaks
      if (selectedProvince) filtered = filtered.filter(p => p.province === selectedProvince)
      if (selectedDifficulty) filtered = filtered.filter(p => p.difficulty === selectedDifficulty)

      this.$app.innerHTML = `
        <div class="page-header">
          <h1>山象</h1>
          <p>${peaks.length} 座山峰 · 天气预警</p>
        </div>
        <div class="filter-bar">
          <select class="province-select" id="province-filter">
            <option value="">全部省份</option>
            ${provinces.map(p => `<option value="${p}" ${p === selectedProvince ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="filter-bar">
          ${[0,1,2,3,4,5].map(d => `<span class="filter-chip ${d === selectedDifficulty ? 'active' : ''}" data-diff="${d}">${d === 0 ? '全部' : '★'.repeat(d)}</span>`).join('')}
        </div>
        <div class="peak-list">
          ${filtered.map(p => `
            <div class="peak-card" data-id="${p.id}">
              <div class="peak-info">
                <h3>${p.name}</h3>
                <div class="peak-meta">
                  <span>${p.elevation}m</span>
                  <span>${p.province}</span>
                  <span>${p.regionTag}</span>
                </div>
              </div>
              <span class="difficulty-badge diff-${p.difficulty}">★${p.difficulty}</span>
            </div>
          `).join('')}
        </div>
        ${filtered.length === 0 ? '<div class="empty-state"><div class="icon">🔍</div><p>无匹配山峰</p></div>' : ''}
      `

      document.getElementById('province-filter').addEventListener('change', e => {
        selectedProvince = e.target.value
        render()
      })

      this.$app.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          selectedDifficulty = parseInt(chip.dataset.diff)
          render()
        })
      })

      this.$app.querySelectorAll('.peak-card').forEach(card => {
        card.addEventListener('click', () => {
          location.hash = `#/peak/${card.dataset.id}`
        })
      })
    }

    render()
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
      <div class="loading">知天时，择良日，山野自有同行人</div>
    `

    document.getElementById('back-btn').addEventListener('click', () => { location.hash = '#/' })

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

    const hourlyHtml = h.time.slice(currentHourIdx, currentHourIdx + 24).map((t, i) => {
      const idx = currentHourIdx + i
      return `<div class="hour-card">
        <div class="time">${new Date(t).getHours()}:00</div>
        <div class="temp">${h.temperature_2m[idx]}°</div>
        <div class="wind">${h.wind_speed_10m[idx]}km/h</div>
      </div>`
    }).join('')

    const weekdays = ['周日','周一','周二','周三','周四','周五','周六']
    const dailyHtml = d.time.map((t, i) => {
      const date = new Date(t)
      return `<div class="daily-item">
        <span class="day">${i === 0 ? '今天' : weekdays[date.getDay()]}</span>
        <span class="temps"><span class="high">${d.temperature_2m_max[i]}°</span> / <span class="low">${d.temperature_2m_min[i]}°</span></span>
      </div>`
    }).join('')

    const loadingEl = this.$app.querySelector('.loading')
    if (loadingEl) {
      loadingEl.outerHTML = `
        <div class="section-title">当前天气</div>
        <div class="weather-now">
          <div class="item"><div class="value">${current.temp}°C</div><div class="label">温度</div></div>
          <div class="item"><div class="value">${current.feels}°C</div><div class="label">体感</div></div>
          <div class="item"><div class="value">${current.wind}km/h</div><div class="label">风速</div></div>
          <div class="item"><div class="value">${current.gust}km/h</div><div class="label">阵风</div></div>
          <div class="item"><div class="value">${current.precip}%</div><div class="label">降水概率</div></div>
          <div class="item"><div class="value">${current.uv}</div><div class="label">紫外线</div></div>
          <div class="item"><div class="value">${(current.vis/1000).toFixed(1)}km</div><div class="label">能见度</div></div>
        </div>
        <div class="section-title">逐小时预报</div>
        <div class="hourly-scroll">${hourlyHtml}</div>
        <div class="section-title">7日预报</div>
        <div class="daily-list">${dailyHtml}</div>
      `
    }
  },

  async loadRealtime(peak) {
    const container = document.getElementById('realtime-container')
    if (!container) return
    try {
      const res = await fetch(`realtime/latest.json`)
      if (!res.ok) return
      const json = await res.json()
      const data = json.data && json.data[peak.name]
      if (!data || !data.items || data.items.length === 0) return
      const today = new Date().toISOString().split('T')[0]
      if (data.date !== today) return
      container.innerHTML = `
        <div class="realtime-section">
          <div class="section-label">今日实况 · 来自社交分享</div>
          ${data.items.map(item => `
            <div class="realtime-item">${item.content}</div>
          `).join('')}
          <div class="realtime-source">数据来源：${data.source || '社交媒体'} · ${data.date}</div>
        </div>
      `
    } catch (e) {
      // 无实况数据不展示
    }
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
