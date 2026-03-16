async function deleteAnalysis(id) {
    if (confirm('Вы уверены, что хотите удалить этот отчет?')) {
        try {
            // Поскольку в server.js нет префикса, путь должен начинаться с /api
            const response = await fetch(`/delete-analysis/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    location.reload(); 
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } else {
                // Если сервер ответил 404 или 500
                alert('Сервер ответил ошибкой: ' + response.status);
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Не удалось связаться с сервером. Убедитесь, что сервер запущен.');
        }
    }
}