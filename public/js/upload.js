// Валидация даты и файла
const analysisFormEl = document.getElementById('analysisForm');

if (analysisFormEl) analysisFormEl.addEventListener('submit', function (e) {
    const dateInput = document.getElementById('testDate').value;
    const selectedDate = new Date(dateInput);
    const today = new Date();

    // Сбрасываем часы для корректного сравнения
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
        e.preventDefault();
        alert('Дата анализа не может быть в будущем!');
        return;
    }

    const fileInput = document.getElementById('reportPdf');
    if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            e.preventDefault();
            alert('Пожалуйста, загрузите файл в формате PDF');
        }
    }
});

// Устанавливаем ограничение в календаре (max date = today)
const testDateEl = document.getElementById('testDate');
if (testDateEl) {
    const todayStr = new Date().toISOString().split('T')[0];
    testDateEl.setAttribute('max', todayStr);
}

// Обновление label при выборе файла
const reportPdfEl = document.getElementById('reportPdf');
if (reportPdfEl) reportPdfEl.addEventListener('change', function (e) {
    const fileName = e.target.files[0]?.name || '';
    const label = document.getElementById('fileLabel');

    if (fileName) {
        label.textContent = `📄 ${fileName}`;
        label.classList.add('has-file');
    } else {
        label.textContent = '📄 Choose PDF file or drag it here';
        label.classList.remove('has-file');
    }
});

// Drag and drop
const fileLabel = document.getElementById('fileLabel');
const fileInput = document.getElementById('reportPdf');

if (fileLabel && fileInput) {
    fileLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileLabel.style.borderColor = '#b026ff';
        fileLabel.style.background = '#fafaff';
    });

    fileLabel.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileLabel.style.borderColor = '#cbd5e1';
        fileLabel.style.background = '#f8fafc';
    });

    fileLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileLabel.style.borderColor = '#cbd5e1';
        fileLabel.style.background = '#f8fafc';

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            fileInput.files = files;
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        } else {
            alert('Пожалуйста, загрузите файл в формате PDF');
        }
    });
}

// Отправка формы через AJAX
if (analysisFormEl) analysisFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    try {
        const res = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await res.json();

        if (result.success) {
            displayResults(result);
        } else {
            throw new Error(result.error || 'Ошибка загрузки');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

async function displayResults(data) {
    document.getElementById('healthTrendSection').style.display = 'flex';

    let historyAnalyses = [];
    try {
        const historyRes = await fetch('/analyses/history');
        const historyData = await historyRes.json();
        if (historyData.success) {
            historyAnalyses = historyData.analyses;
        }
    } catch (e) {
        console.warn('Не удалось загрузить историю анализов:', e);
    }

    const changesList = document.getElementById('trendChangesList');
    changesList.innerHTML = '';

    data.results.forEach((result) => {
        const changeItem = document.createElement('div');

        let prevValue = null;
        if (historyAnalyses.length > 1) {
            const prevAnalysis = historyAnalyses[1];
            const prevIndicator = prevAnalysis.indicators.find(ind => ind.name === result.name);
            if (prevIndicator) prevValue = prevIndicator.val;
        }

        const hasPrev = prevValue !== null;
        const changePercent = hasPrev
            ? ((result.val - prevValue) / prevValue * 100).toFixed(1)
            : null;

        changeItem.className = 'change-item';
        changeItem.innerHTML = `
            <div class="change-info">   
                <div>
                    <p class="change-name">${result.name}</p>
                    <p class="change-date">${hasPrev ? 'Предыдущий → Текущий' : 'Первый анализ'}</p>
                </div>
            </div>
            <div class="change-values">
                <p class="current-val">${result.val.toFixed(1)} ${result.unit}
                    ${hasPrev ? `<span class="badge-down">${changePercent > 0 ? '+' : ''}${changePercent}%</span>` : ''}
                </p>
                ${hasPrev ? `<p class="prev-val">Предыдущее: ${prevValue.toFixed(1)} ${result.unit}</p>` : '<p class="prev-val">Нет предыдущих данных</p>'}
            </div>
        `;
        changesList.appendChild(changeItem);
    });

    buildTrendChart(data.results, historyAnalyses);

    document.getElementById('healthTrendSection').scrollIntoView({ behavior: 'smooth' });
}

function buildTrendChart(results, historyAnalyses = []) {
    if (currentChart) currentChart.destroy();

    const ctx = document.getElementById('trendChart').getContext('2d');
    const colors = ['#ec4899', '#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6', '#ef4444'];
    const datasets = [];

    const labels = historyAnalyses.length > 1
        ? [...historyAnalyses].reverse().map(a =>
            new Date(a.testDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
          )
        : ['Предыдущий', 'Текущий'];

    results.forEach((item, index) => {
        if (index >= 6) return;

        let dataPoints;
        if (historyAnalyses.length > 1) {
            dataPoints = [...historyAnalyses].reverse().map(analysis => {
                const ind = analysis.indicators.find(i => i.name === item.name);
                return ind ? ind.val : null;
            });
        } else {
            dataPoints = [null, item.val];
        }

        datasets.push({
            label: item.name,
            data: dataPoints,
            borderColor: colors[index % colors.length],
            backgroundColor: index < 2 ? colors[index % colors.length] + '20' : 'transparent',
            borderWidth: 2,
            fill: index < 2,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 4
        });
    });

    const allValues = datasets.flatMap(d => d.data.filter(v => v !== null));
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const yAxisMax = Math.ceil(maxValue * 1.2 / 50) * 50;

    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 20,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y !== null ? context.parsed.y.toFixed(1) : '—';
                            const unit = results[context.datasetIndex]?.unit || '';
                            return `${label}: ${value} ${unit}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: yAxisMax,
                    ticks: { stepSize: yAxisMax / 4, color: '#9ca3af', font: { size: 10 } },
                    border: { display: false },
                    grid: { color: '#f3f4f6' }
                },
                x: {
                    ticks: { color: '#9ca3af', font: { size: 11 } },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

function resetForm() {
    if (analysisFormEl) analysisFormEl.reset();
    const fileLabelEl = document.getElementById('fileLabel');
    if (fileLabelEl) {
        fileLabelEl.textContent = '📄 Choose PDF file or drag it here';
        fileLabelEl.classList.remove('has-file');
    }
    const trendSection = document.getElementById('healthTrendSection');
    if (trendSection) trendSection.style.display = 'none';
}