function filterAnalyses() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const items = document.querySelectorAll('.analysis-item');
    let found = 0;

    items.forEach(item => {
        const name = item.dataset.name || '';
        if (name.includes(query)) {
            item.style.display = 'flex';
            found++;
        } else {
            item.style.display = 'none';
        }
    });

    document.getElementById('noSearchResult').style.display = found === 0 ? 'block' : 'none';
}

async function deleteAnalysis(id) {
    if (!confirm('Удалить анализ?')) return;
    const res = await fetch('/api/analyses/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) location.reload();
    else alert('Ошибка: ' + data.error);
}