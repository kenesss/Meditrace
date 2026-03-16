let currentChart = null;

        // Валидация даты и файла
        document.getElementById('analysisForm').addEventListener('submit', function(e) {
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
        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById('testDate').setAttribute('max', todayStr);

        // Обновление label при выборе файла
        document.getElementById('reportPdf').addEventListener('change', function(e) {
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

        // Отправка формы через AJAX
        document.getElementById('analysisForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
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

        function displayResults(data) {
            // Показываем Health Trend Analysis блок
            document.getElementById('healthTrendSection').style.display = 'flex';
            
            // Заполняем список изменений
            const changesList = document.getElementById('trendChangesList');
            changesList.innerHTML = '';
            
            data.results.forEach((result, index) => {
                const changeItem = document.createElement('div');
                
                // Генерируем случайные предыдущие значения для демонстрации
                const prevValue = result.val * (0.9 + Math.random() * 0.2);
                const changePercent = ((result.val - prevValue) / prevValue * 100).toFixed(1);
                const isGoodTrend = result.name === 'Cholesterol'; // Пример: холестерин улучшился
                
                changeItem.className = `change-item ${isGoodTrend ? 'good-trend' : ''}`;
                changeItem.innerHTML = `
                    <div class="change-info">
                        <svg width="20" height="20" fill="none" stroke="${isGoodTrend ? '#10b981' : '#9ca3af'}" stroke-width="2" viewBox="0 0 24 24">
                            ${isGoodTrend ? 
                                '<path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>' :
                                '<path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"></path>'
                            }
                        </svg>
                        <div>
                            <p class="change-name">${result.name}</p>
                            <p class="change-date">07/24 → 12/24</p>
                        </div>
                    </div>
                    <div class="change-values">
                        <p class="current-val">${result.val.toFixed(1)} ${result.unit} 
                            <span class="badge-down ${isGoodTrend ? 'badge-good' : ''}">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                </svg> 
                                ${Math.abs(changePercent)}%
                            </span>
                        </p>
                        <p class="prev-val">Previous: ${prevValue.toFixed(1)} ${result.unit}</p>
                    </div>
                `;
                changesList.appendChild(changeItem);
            });
            
            // Строим график трендов
            buildTrendChart(data.results);
            
            // Прокручиваем к результатам
            document.getElementById('healthTrendSection').scrollIntoView({ behavior: 'smooth' });
        }

        function getStatus(result) {
            // Простая логика статуса
            if (result.reference) {
                return { text: 'Норма', class: 'normal' };
            }
            return { text: 'Требует внимания', class: 'warning' };
        }

        function buildTrendChart(results) {
            // Уничтожаем старый график
            if (currentChart) currentChart.destroy();
            
            const ctx = document.getElementById('trendChart').getContext('2d');
            
            // Используем реальные данные из PDF
            const colors = ['#ec4899', '#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6', '#ef4444'];
            const datasets = [];
            
            results.forEach((item, index) => {
                if (index >= 6) return; // Максимум 6 показателей
                
                // Используем реальные данные из PDF
                const currentValue = item.val;
                
                // Создаем исторические данные для демонстрации тренда
                // В реальном приложении здесь будут данные из базы данных
                const prevValue = currentValue * (0.85 + Math.random() * 0.3); // ±15% вариация
                
                datasets.push({
                    label: item.name,
                    data: [prevValue, currentValue],
                    borderColor: colors[index % colors.length],
                    backgroundColor: index < 2 ? colors[index % colors.length] + '20' : 'transparent',
                    borderWidth: 2,
                    fill: index < 2, // Только первые два с заливкой
                    tension: 0,
                    pointRadius: 0
                });
            });

            // Определяем максимальное значение для шкалы Y на основе реальных данных
            const maxValue = Math.max(...datasets.map(d => Math.max(...d.data)));
            const yAxisMax = Math.ceil(maxValue * 1.2 / 50) * 50; // Округляем вверх до ближайших 50

            // Настройки графика с реальными данными
            currentChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Previous', 'Current'], // Более понятные метки
                    datasets: datasets
                },
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
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y.toFixed(1);
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
                            ticks: { 
                                stepSize: yAxisMax / 4, 
                                color: '#9ca3af', 
                                font: { size: 10 } 
                            },
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
            document.getElementById('analysisForm').reset();
            document.getElementById('fileLabel').textContent = '📄 Choose PDF file or drag it here';
            document.getElementById('fileLabel').classList.remove('has-file');
            document.getElementById('healthTrendSection').style.display = 'none';
        }