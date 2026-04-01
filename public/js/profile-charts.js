let currentChart = null;

function initProfileDashboard(analyses) {
    renderResultsList(analyses[0], analyses[1] || null);
    buildHistoryChart(analyses);
}

function renderResultsList(latest, previous) {
    const listContainer = document.getElementById('resultsList');
    if (!listContainer) return;

    listContainer.innerHTML = latest.indicators.map(item => {
        let diffHtml = '';
        if (previous) {
            const prevInd = previous.indicators.find(i => i.name === item.name);
            if (prevInd) {
                const diff = (item.val - prevInd.val).toFixed(1);
                const color = diff > 0 ? '#10b981' : '#ef4444';
                diffHtml = `<span style="color: ${color}; font-size: 12px; margin-left: 10px;">
                    ${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)}
                </span>`;
            }
        }

        return `
            <div class="result-row">
                <span style="color: #4b5563;">${item.name}</span>
                <div style="text-align: right;">
                    <strong>${item.val}</strong> <small>${item.unit}</small>
                    ${diffHtml}
                </div>
            </div>
        `;
    }).join('');
}

function buildHistoryChart(analyses) {
    const canvas = document.getElementById('resultsChart');
    if (!canvas) return;

    const sorted = [...analyses].sort((a, b) => new Date(a.testDate) - new Date(b.testDate));
    const labels = sorted.map(a => new Date(a.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    // Берем первые 2 показателя для графика
    const datasets = sorted[0].indicators.slice(0, 2).map((ind, idx) => ({
        label: ind.name,
        data: sorted.map(a => (a.indicators.find(i => i.name === ind.name)?.val || null)),
        borderColor: idx === 0 ? '#ec4899' : '#8b5cf6',
        tension: 0.4,
        fill: false
    }));

    currentChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

async function deleteAnalysis(id) {
    if (confirm('Delete this report?')) {
        const res = await fetch(`/delete-analysis/${id}`, { method: 'DELETE' });
        if (res.ok) window.location.reload();
    }
}

/**
 * Meditrace - Визуализация медицинских показателей
 */
document.addEventListener('DOMContentLoaded', () => {
    const data = window.USER_ANALYSES_DATA;
    const canvas = document.getElementById('healthChart');
    const selector = document.getElementById('indicatorSelector');

    // Если данных нет или элемент не найден — выходим
    if (!data || data.length === 0 || !canvas) return;

    const ctx = canvas.getContext('2d');
    let healthChart = null;

    // 1. Извлекаем все доступные названия показателей из всех отчетов
    const indicatorNames = new Set();
    data.forEach(report => {
        if (report.indicators) {
            report.indicators.forEach(ind => indicatorNames.add(ind.name));
        }
    });

    // 2. Заполняем выпадающий список (Select)
    indicatorNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
    });

    // 3. Функция для парсинга значений (из "5,4 ммоль/л" делает 5.4)
    const parseValue = (valStr) => {
        if (!valStr) return 0;
        const cleaned = valStr.toString().replace(',', '.').replace(/[^\d.]/g, '');
        return parseFloat(cleaned) || 0;
    };

    // 4. Главная функция отрисовки
    const updateChart = (selectedName) => {
        // Собираем точки: дата + значение
        const chartPoints = data
            .map(report => {
                const indicator = report.indicators.find(i => i.name === selectedName);
                if (!indicator) return null;
                
                return {
                    date: new Date(report.createdAt).toLocaleDateString(),
                    value: parseValue(indicator.val)
                };
            })
            .filter(point => point !== null)
            .reverse(); // Хронология от старых к новым

        if (healthChart) healthChart.destroy();

        healthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartPoints.map(p => p.date),
                datasets: [{
                    label: selectedName,
                    data: chartPoints.map(p => p.value),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4, // Плавные линии
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        padding: 12,
                        cornerRadius: 10
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 12 } }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { borderDash: [5, 5], color: '#e2e8f0' },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    };

    // Запускаем график с первым доступным показателем
    if (indicatorNames.size > 0) {
        updateChart(Array.from(indicatorNames)[0]);
    }

    // Слушаем изменения в селекторе
    selector.addEventListener('change', (e) => {
        updateChart(e.target.value);
    });
});