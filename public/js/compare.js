(function () {
  // Заполняем селекты из списка анализов на странице
  function initCompare(analyses) {
    const section = document.getElementById('compare-section');
    const sel1 = document.getElementById('compare-sel-1');
    const sel2 = document.getElementById('compare-sel-2');
    if (!section || !sel1 || !sel2) return;

    analyses.forEach((a, i) => {
      const date = new Date(a.testDate).toLocaleDateString('ru-RU');
      const label = `${date} — ${a.fileName}`;
      sel1.innerHTML += `<option value="${a._id}">${label}</option>`;
      sel2.innerHTML += `<option value="${a._id}">${label}</option>`;
    });

    // По умолчанию выбрать два разных
    if (analyses.length >= 2) sel2.selectedIndex = 1;

    document.getElementById('compare-btn').addEventListener('click', async () => {
      const id1 = sel1.value;
      const id2 = sel2.value;
      if (id1 === id2) {
        alert('Выберите два разных отчёта');
        return;
      }
      const res = await fetch(`/api/compare-analyses?id1=${id1}&id2=${id2}`);
      const data = await res.json();
      if (!data.success) { alert(data.error); return; }
      renderDelta(data);
    });
  }

  function getStatus(val, reference) {
    if (!reference || !val) return { label: 'Нет данных', color: '#6b7280', bg: '#f9fafb' };
    const parts = reference.split('-').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return { label: 'Нет данных', color: '#6b7280', bg: '#f9fafb' };
    if (val < parts[0]) return { label: 'Ниже нормы', color: '#2563eb', bg: '#eff6ff' };
    if (val > parts[1]) return { label: 'Выше нормы', color: '#dc2626', bg: '#fef2f2' };
    return { label: 'В норме', color: '#16a34a', bg: '#f0fdf4' };
  }

  function arrow(diff) {
    if (diff === null) return '<span style="color:#9ca3af">—</span>';
    if (diff > 0) return `<span style="color:#dc2626">▲ +${diff}</span>`;
    if (diff < 0) return `<span style="color:#2563eb">▼ ${diff}</span>`;
    return '<span style="color:#16a34a">= 0</span>';
  }

  function renderDelta(data) {
    const container = document.getElementById('compare-result');
    const d1 = new Date(data.report1.date).toLocaleDateString('ru-RU');
    const d2 = new Date(data.report2.date).toLocaleDateString('ru-RU');

    let rows = data.delta.map(row => {
      const st1 = getStatus(row.val1, row.reference);
      const st2 = getStatus(row.val2, row.reference);
      return `
        <tr style="border-bottom:1px solid #f4f5f7">
          <td style="padding:12px;font-weight:500;color:#172b4d">${row.name}</td>
          <td style="padding:12px;text-align:center">
            <span style="font-weight:bold;color:#172b4d">${row.val1 ?? '—'}</span>
            ${row.val1 !== null ? `<span style="margin-left:6px;background:${st1.bg};color:${st1.color};padding:2px 8px;border-radius:12px;font-size:11px">${st1.label}</span>` : ''}
          </td>
          <td style="padding:12px;text-align:center">
            <span style="font-weight:bold;color:#172b4d">${row.val2 ?? '—'}</span>
            ${row.val2 !== null ? `<span style="margin-left:6px;background:${st2.bg};color:${st2.color};padding:2px 8px;border-radius:12px;font-size:11px">${st2.label}</span>` : ''}
          </td>
          <td style="padding:12px;text-align:center;font-weight:600">${arrow(row.diff)}</td>
          <td style="padding:12px;color:#7a869a;font-size:13px">${row.unit}</td>
        </tr>`;
    }).join('');

    container.style.display = 'block';
    container.innerHTML = `
      <h2 style="margin-bottom:20px;color:#172b4d;font-size:1.25rem">Сравнение анализов</h2>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:500px">
          <thead>
            <tr style="border-bottom:2px solid #f4f5f7;text-align:left">
              <th style="padding:12px;color:#7a869a;font-weight:600">Показатель</th>
              <th style="padding:12px;color:#7a869a;font-weight:600;text-align:center">${d1}</th>
              <th style="padding:12px;color:#7a869a;font-weight:600;text-align:center">${d2}</th>
              <th style="padding:12px;color:#7a869a;font-weight:600;text-align:center">Изменение</th>
              <th style="padding:12px;color:#7a869a;font-weight:600">Ед. изм.</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  window.initCompare = initCompare;
})();
