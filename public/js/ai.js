document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('user-input');
    const container = document.getElementById('chat-messages');
    const text = input.value.trim();

    if (!text) return;

    // 1. Добавляем сообщение пользователя
    appendMessage('user', text);
    input.value = '';

    // 2. Показываем "загрузку"
    const loadingId = 'loading-' + Date.now();
    appendMessage('ai', 'Печатает...', loadingId);

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        const data = await response.json();
        
        // 3. Заменяем загрузку на реальный ответ
        document.getElementById(loadingId).innerText = data.reply;
    } catch (err) {
        document.getElementById(loadingId).innerText = "Ошибка связи с сервером.";
    }
});

function appendMessage(role, text, id = null) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-message`;
    if (id) msgDiv.id = id;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    
    // Плавная прокрутка вниз
    container.scrollTop = container.scrollHeight;
}