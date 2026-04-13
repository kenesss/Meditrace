/**
 * Meditrace — Страница «Мои анализы»
 * Логика: графики показателей + таблица + переключение между анализами
 */

(function () {
    'use strict';
  
    const data = window.MY_ANALYSES_DATA || [];
    if (!data.length) return;
  
    // ── Состояние ──────────────────────────────────────────────────────────────
    let activeAnalysisIndex = 0;
    let activeChart = null;
    let activeTab = 'chart'; // 'chart' | 'table'
  
    // ── DOM ────────────────────────────────────────────────────────────────────
    const analysisCards   = document.querySelectorAll('.ma-analysis-card');
    const tabChart        = document.getElementById('tabChart');
    const tabTable        = document.getElementById('tabTable');
    const chartSection    = document.getElementById('chartSection');
    const tableSection    = document.getElementById('tableSection');
    const indicatorSelect = document.getElementById('indicatorSelect');
    const chartCanvas     = document.getElementById('maChart');
    const tableBody       = document.getElementById('maTableBody');
    const analysisTitle   = document.getElementById('maAnalysisTitle');
    const analysisMeta    = document.getElementById('maAnalysisMeta');
    const searchInput     = document.getElementById('searchInput');
  
    // ── Утилиты ────────────────────────────────────────────────────────────────
    function formatDate(d) {
      return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    }
  
    function parseVal(v) {
      if (v === null || v === undefined) return null;
      const n = parseFloat(String(v).replace(',', '.'));
      return isNaN(n) ? null : n;
    }
  
    function getStatusClass(status) {
      if (!status) return '';
      if (status.label === 'В норме')      return 'status-ok';
      if (status.label === 'Выше нормы')   return 'status-high';
      if (status.label === 'Ниже нормы')   return 'status-low';
      return 'status-nd';
    }
  
    // ── Заполнить селектор показателей ────────────────────────────────────────
    function populateSelector(analysis) {
      indicatorSelect.innerHTML = '';
      (analysis.indicators || []).forEach(ind => {
        const opt = document.createElement('option');
        opt.value = ind.name;
        opt.textContent = ind.name;
        indicatorSelect.appendChild(opt);
      });
    }
  
    // ── Нарисовать график одного показателя по всем анализам ──────────────────
    function buildChart(indicatorName) {
      if (activeChart) { activeChart.destroy(); activeChart = null; }
      if (!chartCanvas) return;
  
      // Берём все анализы, сортируем хронологически
      const sorted = [...data].sort((a, b) => new Date(a.testDate) - new Date(b.testDate));
  
      const labels  = sorted.map(a => new Date(a.testDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }));
      const values  = sorted.map(a => {
        const ind = (a.indicators || []).find(i => i.name === indicatorName);
        return ind ? parseVal(ind.val) : null;
      });
  
      // Референс из текущего анализа
      const currentAnalysis = data[activeAnalysisIndex];
      const refInd = (currentAnalysis.indicators || []).find(i => i.name === indicatorName);
      const refStr = refInd ? String(refInd.reference || '') : '';
      const refParts = refStr.split('-').map(parseFloat);
      const hasRef = refParts.length === 2 && !isNaN(refParts[0]) && !isNaN(refParts[1]);
  
      const plugins = [window.ChartAnnotation].filter(Boolean);
  
      const config = {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: indicatorName,
            data: values,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: values.map(v => {
              if (v === null || !hasRef) return '#6366f1';
              if (v < refParts[0]) return '#3b82f6';
              if (v > refParts[1]) return '#ef4444';
              return '#22c55e';
            }),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            spanGaps: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                label: ctx => {
                  const v = ctx.parsed.y;
                  const unit = refInd ? (refInd.unit || '') : '';
                  return ` ${v} ${unit}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#64748b', font: { size: 12 } }
            },
            y: {
              beginAtZero: false,
              grid: { color: '#e2e8f0', borderDash: [4, 4] },
              ticks: { color: '#64748b' }
            }
          }
        }
      };
  
      activeChart = new Chart(chartCanvas.getContext('2d'), config);
    }
  
    // ── Нарисовать таблицу показателей ────────────────────────────────────────
    function buildTable(analysis) {
      if (!tableBody) return;
      tableBody.innerHTML = '';
      (analysis.indicators || []).forEach(ind => {
        const statusClass = getStatusClass(ind.status);
        const statusLabel = ind.status ? ind.status.label : 'Нет данных';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ma-td-name">${ind.name}</td>
          <td class="ma-td-val">${ind.val ?? '—'} <span class="ma-unit">${ind.unit || ''}</span></td>
          <td class="ma-td-ref">${ind.reference || '—'}</td>
          <td><span class="ma-status ${statusClass}">${statusLabel}</span></td>
        `;
        tableBody.appendChild(tr);
      });
    }
  
    // ── Обновить заголовок активного анализа ─────────────────────────────────
    function updateHeader(analysis) {
      if (analysisTitle) analysisTitle.textContent = analysis.fileName || analysis.testType || 'Анализ';
      if (analysisMeta) {
        analysisMeta.textContent =
          formatDate(analysis.testDate || analysis.createdAt) +
          ' · ' + (analysis.indicators || []).length + ' показателей';
      }
    }
  
    // ── Активировать карточку анализа ────────────────────────────────────────
    function activateAnalysis(index) {
      activeAnalysisIndex = index;
      const analysis = data[index];
  
      // Подсветить карточку
      analysisCards.forEach((c, i) => {
        c.classList.toggle('ma-card-active', i === index);
      });
  
      updateHeader(analysis);
      populateSelector(analysis);
      buildTable(analysis);
  
      const selected = indicatorSelect.value;
      if (selected) buildChart(selected);
    }
  
    // ── Вкладки ──────────────────────────────────────────────────────────────
    function switchTab(tab) {
      activeTab = tab;
      tabChart.classList.toggle('ma-tab-active', tab === 'chart');
      tabTable.classList.toggle('ma-tab-active', tab === 'table');
      chartSection.style.display = tab === 'chart' ? 'block' : 'none';
      tableSection.style.display = tab === 'table' ? 'block' : 'none';
      if (tab === 'chart') {
        const selected = indicatorSelect.value;
        if (selected) buildChart(selected);
      }
    }
  
    // ── Поиск по списку карточек ──────────────────────────────────────────────
    function filterCards() {
      const q = (searchInput.value || '').toLowerCase();
      analysisCards.forEach(card => {
        const name = (card.dataset.name || '').toLowerCase();
        card.style.display = name.includes(q) ? '' : 'none';
      });
    }
  
    // ── Навешать обработчики ──────────────────────────────────────────────────
    analysisCards.forEach((card, i) => {
      card.addEventListener('click', () => activateAnalysis(i));
    });
  
    if (tabChart)        tabChart.addEventListener('click', () => switchTab('chart'));
    if (tabTable)        tabTable.addEventListener('click', () => switchTab('table'));
    if (indicatorSelect) indicatorSelect.addEventListener('change', e => buildChart(e.target.value));
    if (searchInput)     searchInput.addEventListener('input', filterCards);
  
    // ── Инициализация ─────────────────────────────────────────────────────────
    activateAnalysis(0);
    switchTab('chart');
  })();

  /**
 * Meditrace — Страница «Мои анализы»
 * Логика: графики показателей + таблица + переключение между анализами
 */

(function () {
  'use strict';

  const data = window.MY_ANALYSES_DATA || [];
  if (!data.length) return;

  // ── Состояние ──────────────────────────────────────────────────────────────
  let activeAnalysisIndex = 0;
  let activeChart = null;
  let activeTab = 'chart'; // 'chart' | 'table'

  // ── DOM ────────────────────────────────────────────────────────────────────
  const analysisCards   = document.querySelectorAll('.ma-analysis-card');
  const tabChart        = document.getElementById('tabChart');
  const tabTable        = document.getElementById('tabTable');
  const chartSection    = document.getElementById('chartSection');
  const tableSection    = document.getElementById('tableSection');
  const indicatorSelect = document.getElementById('indicatorSelect');
  const chartCanvas     = document.getElementById('maChart');
  const tableBody       = document.getElementById('maTableBody');
  const analysisTitle   = document.getElementById('maAnalysisTitle');
  const analysisMeta    = document.getElementById('maAnalysisMeta');
  const searchInput     = document.getElementById('searchInput');

  // ── Утилиты ────────────────────────────────────────────────────────────────
  function formatDate(d) {
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function parseVal(v) {
    if (v === null || v === undefined) return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  function getStatusClass(status) {
    if (!status) return '';
    if (status.label === 'В норме')      return 'status-ok';
    if (status.label === 'Выше нормы')   return 'status-high';
    if (status.label === 'Ниже нормы')   return 'status-low';
    return 'status-nd';
  }

  // ── Заполнить селектор показателей ────────────────────────────────────────
  function populateSelector(analysis) {
    indicatorSelect.innerHTML = '';
    (analysis.indicators || []).forEach(ind => {
      const opt = document.createElement('option');
      opt.value = ind.name;
      opt.textContent = ind.name;
      indicatorSelect.appendChild(opt);
    });
  }

  // ── Нарисовать график одного показателя по всем анализам ──────────────────
  function buildChart(indicatorName) {
    if (activeChart) { activeChart.destroy(); activeChart = null; }
    if (!chartCanvas) return;

    // Берём все анализы, сортируем хронологически
    const sorted = [...data].sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

    const labels  = sorted.map(a => new Date(a.testDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }));
    const values  = sorted.map(a => {
      const ind = (a.indicators || []).find(i => i.name === indicatorName);
      return ind ? parseVal(ind.val) : null;
    });

    // Референс из текущего анализа
    const currentAnalysis = data[activeAnalysisIndex];
    const refInd = (currentAnalysis.indicators || []).find(i => i.name === indicatorName);
    const refStr = refInd ? String(refInd.reference || '') : '';
    const refParts = refStr.split('-').map(parseFloat);
    const hasRef = refParts.length === 2 && !isNaN(refParts[0]) && !isNaN(refParts[1]);

    const plugins = [window.ChartAnnotation].filter(Boolean);

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: indicatorName,
          data: values,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: values.map(v => {
            if (v === null || !hasRef) return '#6366f1';
            if (v < refParts[0]) return '#3b82f6';
            if (v > refParts[1]) return '#ef4444';
            return '#22c55e';
          }),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          spanGaps: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y;
                const unit = refInd ? (refInd.unit || '') : '';
                return ` ${v} ${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 12 } }
          },
          y: {
            beginAtZero: false,
            grid: { color: '#e2e8f0', borderDash: [4, 4] },
            ticks: { color: '#64748b' }
          }
        }
      }
    };

    activeChart = new Chart(chartCanvas.getContext('2d'), config);
  }

  // ── Нарисовать таблицу показателей ────────────────────────────────────────
  function buildTable(analysis) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    (analysis.indicators || []).forEach(ind => {
      const statusClass = getStatusClass(ind.status);
      const statusLabel = ind.status ? ind.status.label : 'Нет данных';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="ma-td-name">${ind.name}</td>
        <td class="ma-td-val">${ind.val ?? '—'} <span class="ma-unit">${ind.unit || ''}</span></td>
        <td class="ma-td-ref">${ind.reference || '—'}</td>
        <td><span class="ma-status ${statusClass}">${statusLabel}</span></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ── Обновить заголовок активного анализа ─────────────────────────────────
  function updateHeader(analysis) {
    if (analysisTitle) analysisTitle.textContent = analysis.fileName || analysis.testType || 'Анализ';
    if (analysisMeta) {
      analysisMeta.textContent =
        formatDate(analysis.testDate || analysis.createdAt) +
        ' · ' + (analysis.indicators || []).length + ' показателей';
    }
  }

  // ── Активировать карточку анализа ────────────────────────────────────────
  function activateAnalysis(index) {
    activeAnalysisIndex = index;
    const analysis = data[index];

    // Подсветить карточку
    analysisCards.forEach((c, i) => {
      c.classList.toggle('ma-card-active', i === index);
    });

    updateHeader(analysis);
    populateSelector(analysis);
    buildTable(analysis);

    const selected = indicatorSelect.value;
    if (selected) buildChart(selected);
  }

  // ── Вкладки ──────────────────────────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    tabChart.classList.toggle('ma-tab-active', tab === 'chart');
    tabTable.classList.toggle('ma-tab-active', tab === 'table');
    chartSection.style.display = tab === 'chart' ? 'block' : 'none';
    tableSection.style.display = tab === 'table' ? 'block' : 'none';
    if (tab === 'chart') {
      const selected = indicatorSelect.value;
      if (selected) buildChart(selected);
    }
  }

  // ── Поиск по списку карточек ──────────────────────────────────────────────
  function filterCards() {
    const q = (searchInput.value || '').toLowerCase();
    analysisCards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      card.style.display = name.includes(q) ? '' : 'none';
    });
  }

  // ── Навешать обработчики ──────────────────────────────────────────────────
  analysisCards.forEach((card, i) => {
    card.addEventListener('click', () => activateAnalysis(i));
  });

  if (tabChart)        tabChart.addEventListener('click', () => switchTab('chart'));
  if (tabTable)        tabTable.addEventListener('click', () => switchTab('table'));
  if (indicatorSelect) indicatorSelect.addEventListener('change', e => buildChart(e.target.value));
  if (searchInput)     searchInput.addEventListener('input', filterCards);

  // ── Инициализация ─────────────────────────────────────────────────────────
  activateAnalysis(0);
  switchTab('chart');
})();