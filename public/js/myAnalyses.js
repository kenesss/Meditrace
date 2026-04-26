(function () {
    'use strict';

    if (typeof Chart === 'undefined') {
        window.addEventListener('load', () => init());
    } else {
        init();
    }

    function init() {
        const data = window.MY_ANALYSES_DATA || [];
        if (!data.length) return;

        // ── Состояние ──────────────────────────────────────────────────────────────
        let activeAnalysisIndex = 0;
        let activeChart = null;
        let activeTab = 'chart';
        let isDirty = false; // есть ли несохранённые изменения

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
        const tableEditBar    = document.getElementById('tableEditBar');
        const saveEditBtn     = document.getElementById('saveEditBtn');
        const cancelEditBtn   = document.getElementById('cancelEditBtn');

        // ── Утилиты ────────────────────────────────────────────────────────────────
        function formatDate(d) {
            return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
        }

        function parseVal(v) {
            if (v === null || v === undefined) return null;
            const n = parseFloat(String(v).replace(',', '.'));
            return isNaN(n) ? null : n;
        }

        function computeStatus(val, reference) {
            if (!reference || val === null || val === undefined) return { label: 'Нет данных', cls: 'status-nd' };
            const m = String(reference).match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
            if (!m) return { label: 'Нет данных', cls: 'status-nd' };
            const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
            const v  = parseFloat(val);
            if (isNaN(v)) return { label: 'Нет данных', cls: 'status-nd' };
            if (v < lo)   return { label: 'Ниже нормы', cls: 'status-low' };
            if (v > hi)   return { label: 'Выше нормы', cls: 'status-high' };
            return { label: 'В норме', cls: 'status-ok' };
        }

        // ── Грязная метка ─────────────────────────────────────────────────────────
        function markDirty() {
            if (!isDirty) {
                isDirty = true;
                if (tableEditBar) tableEditBar.style.display = 'flex';
            }
        }

        function clearDirty() {
            isDirty = false;
            if (tableEditBar) tableEditBar.style.display = 'none';
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

        // ── Нарисовать график ─────────────────────────────────────────────────────
        function buildChart(indicatorName) {
            if (!chartCanvas) return;

            const existing = Chart.getChart(chartCanvas);
            if (existing) existing.destroy();
            activeChart = null;

            const sorted = [...data].sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

            const labels = sorted.map(a =>
                new Date(a.testDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
            );
            const values = sorted.map(a => {
                const ind = (a.indicators || []).find(i => i.name === indicatorName);
                return ind ? parseVal(ind.val) : null;
            });

            const currentAnalysis = data[activeAnalysisIndex];
            const refInd  = (currentAnalysis.indicators || []).find(i => i.name === indicatorName);
            const refStr  = refInd ? String(refInd.reference || '') : '';
            const refParts = refStr.split('-').map(parseFloat);
            const hasRef  = refParts.length === 2 && !isNaN(refParts[0]) && !isNaN(refParts[1]);

            activeChart = new Chart(chartCanvas.getContext('2d'), {
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
                                    const v    = ctx.parsed.y;
                                    const unit = refInd ? (refInd.unit || '') : '';
                                    return ` ${v} ${unit}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
                        y: { beginAtZero: false, grid: { color: '#e2e8f0', borderDash: [4, 4] }, ticks: { color: '#64748b' } }
                    }
                }
            });
        }

        // ── Нарисовать таблицу с возможностью редактирования ─────────────────────
        function buildTable(analysis) {
            if (!tableBody) return;
            clearDirty();
            tableBody.innerHTML = '';

            (analysis.indicators || []).forEach((ind, idx) => {
                const status = computeStatus(ind.val, ind.reference);
                const tr = document.createElement('tr');
                tr.dataset.idx = idx;

                tr.innerHTML = `
                    <td class="ma-td-name">${ind.name}</td>

                    <!-- ✅ Редактируемое значение -->
                    <td>
                        <span class="ma-td-val ma-editable-val">
                            ${ind.val ?? '—'} <span class="ma-unit">${ind.unit || ''}</span>
                        </span>
                        <input class="ma-edit-input ma-val-input" style="display:none;"
                               value="${ind.val ?? ''}" placeholder="значение" type="text">
                    </td>

                    <!-- ✅ Редактируемый референс -->
                    <td>
                        <span class="ma-td-ref ma-editable-ref">${ind.reference || '—'}</span>
                        <input class="ma-edit-input ma-ref-input" style="display:none;"
                               value="${ind.reference || ''}" placeholder="н-р 3.5-5.0" type="text">
                    </td>

                    <td class="ma-td-status-cell">
                        <span class="ma-status ${status.cls}">${status.label}</span>
                    </td>

                    <!-- Кнопка редактировать / подтвердить строку -->
                    <td style="text-align:right; white-space:nowrap;">
                        <button class="ma-row-edit-btn" title="Редактировать">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="ma-row-confirm-btn" style="display:none;" title="Применить">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                    </td>
                `;

                // ── Логика переключения режима строки ──
                const editBtn    = tr.querySelector('.ma-row-edit-btn');
                const confirmBtn = tr.querySelector('.ma-row-confirm-btn');
                const valSpan    = tr.querySelector('.ma-editable-val');
                const refSpan    = tr.querySelector('.ma-editable-ref');
                const valInput   = tr.querySelector('.ma-val-input');
                const refInput   = tr.querySelector('.ma-ref-input');
                const statusCell = tr.querySelector('.ma-td-status-cell');

                editBtn.addEventListener('click', () => {
                    // Показать инпуты
                    valSpan.style.display = 'none';
                    refSpan.style.display = 'none';
                    valInput.style.display = 'inline-block';
                    refInput.style.display = 'inline-block';
                    editBtn.style.display = 'none';
                    confirmBtn.style.display = 'inline-flex';
                    valInput.focus();
                    markDirty();
                });

                confirmBtn.addEventListener('click', () => {
                    const newVal = valInput.value.trim();
                    const newRef = refInput.value.trim();

                    // Обновить данные в памяти
                    data[activeAnalysisIndex].indicators[idx].val       = newVal;
                    data[activeAnalysisIndex].indicators[idx].reference  = newRef;

                    // Пересчитать статус
                    const newStatus = computeStatus(newVal, newRef);
                    statusCell.innerHTML = `<span class="ma-status ${newStatus.cls}">${newStatus.label}</span>`;

                    // Обновить span
                    const unit = data[activeAnalysisIndex].indicators[idx].unit || '';
                    valSpan.innerHTML = `${newVal || '—'} <span class="ma-unit">${unit}</span>`;
                    refSpan.textContent = newRef || '—';

                    // Вернуть в режим просмотра
                    valInput.style.display = 'none';
                    refInput.style.display = 'none';
                    valSpan.style.display = '';
                    refSpan.style.display = '';
                    editBtn.style.display = 'inline-flex';
                    confirmBtn.style.display = 'none';

                    markDirty();
                });

                tableBody.appendChild(tr);
            });
        }

        // ── Сохранить изменения на сервере ────────────────────────────────────────
        async function saveChanges() {
            const analysis = data[activeAnalysisIndex];
            const id = analysis._id;
            if (!id) { alert('Не найден ID анализа'); return; }

            saveEditBtn.disabled = true;
            saveEditBtn.textContent = 'Сохраняем…';

            try {
                const res = await fetch(`/api/analyses/${id}/indicators`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ indicators: analysis.indicators })
                });
                const json = await res.json();
                if (json.success) {
                    clearDirty();
                    // Перестроить график с новыми данными
                    if (activeTab === 'chart') {
                        const selected = indicatorSelect.value;
                        if (selected) buildChart(selected);
                    }
                } else {
                    alert('Ошибка сохранения: ' + (json.error || 'неизвестная ошибка'));
                }
            } catch (err) {
                alert('Не удалось сохранить изменения');
            } finally {
                saveEditBtn.disabled = false;
                saveEditBtn.textContent = 'Сохранить';
            }
        }

        // ── Обновить заголовок ────────────────────────────────────────────────────
        function updateHeader(analysis) {
            if (analysisTitle) analysisTitle.textContent = analysis.fileName || analysis.testType || 'Анализ';
            if (analysisMeta) {
                analysisMeta.textContent =
                    formatDate(analysis.testDate || analysis.createdAt) +
                    ' · ' + (analysis.indicators || []).length + ' показателей';
            }
        }

        // ── Активировать анализ ───────────────────────────────────────────────────
        function activateAnalysis(index) {
            activeAnalysisIndex = index;
            const analysis = data[index];

            analysisCards.forEach((c, i) => {
                c.classList.toggle('ma-card-active', i === index);
            });

            updateHeader(analysis);
            populateSelector(analysis);
            buildTable(analysis);

            const selected = indicatorSelect.value;
            if (selected) buildChart(selected);
        }

        // ── Вкладки ───────────────────────────────────────────────────────────────
        function switchTab(tab) {
            activeTab = tab;
            if (tabChart)    tabChart.classList.toggle('ma-tab-active', tab === 'chart');
            if (tabTable)    tabTable.classList.toggle('ma-tab-active', tab === 'table');
            if (chartSection) chartSection.style.display = tab === 'chart' ? 'block' : 'none';
            if (tableSection) tableSection.style.display = tab === 'table' ? 'block' : 'none';
            if (tab === 'chart') {
                const selected = indicatorSelect ? indicatorSelect.value : null;
                if (selected) buildChart(selected);
            }
        }

        // ── Поиск ─────────────────────────────────────────────────────────────────
        function filterCards() {
            const q = (searchInput.value || '').toLowerCase();
            analysisCards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                card.style.display = name.includes(q) ? '' : 'none';
            });
        }

        // ── Обработчики ───────────────────────────────────────────────────────────
        analysisCards.forEach((card, i) => {
            card.addEventListener('click', (e) => {
                // Не переключать если кликнули на кнопку удаления
                if (e.target.closest('.ma-delete-btn')) return;
                activateAnalysis(i);
            });
        });

        if (tabChart)        tabChart.addEventListener('click', () => switchTab('chart'));
        if (tabTable)        tabTable.addEventListener('click', () => switchTab('table'));
        if (indicatorSelect) indicatorSelect.addEventListener('change', e => buildChart(e.target.value));
        if (searchInput)     searchInput.addEventListener('input', filterCards);
        if (saveEditBtn)     saveEditBtn.addEventListener('click', saveChanges);
        if (cancelEditBtn)   cancelEditBtn.addEventListener('click', () => {
            buildTable(data[activeAnalysisIndex]); // сброс всех изменений
        });

        // ── Удаление анализа ──────────────────────────────────────────────────────
        document.querySelectorAll('.ma-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const card = btn.closest('.ma-analysis-card');
                // ✅ ИСПРАВЛЕНО: берём id из data-id карточки
                const id = card.dataset.id;
                if (!id) { alert('Не найден ID анализа'); return; }

                if (!confirm('Удалить этот анализ?')) return;

                try {
                    const res  = await fetch(`/delete-analysis/${id}`, { method: 'DELETE' });
                    const json = await res.json();
                    if (json.success) {
                        window.location.reload();
                    } else {
                        alert('Ошибка: ' + (json.error || 'неизвестная ошибка'));
                    }
                } catch (err) {
                    alert('Не удалось удалить анализ');
                }
            });
        });

        // ── Инициализация ─────────────────────────────────────────────────────────
        activateAnalysis(0);
        switchTab('chart');
    }
})();