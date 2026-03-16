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