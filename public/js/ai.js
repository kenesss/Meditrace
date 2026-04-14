const chatFormEl = document.getElementById('chat-form');
if (chatFormEl) chatFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('user-input');
    const container = document.getElementById('chat-messages');
    const text = input.value.trim();

    if (!text) return;

    appendMessage('user', text);
    input.value = '';

    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.className = 'message ai-message';
    aiMsgDiv.innerText = 'Печатает...';
    container.appendChild(aiMsgDiv);
    container.scrollTop = container.scrollHeight;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        aiMsgDiv.innerText = data.reply || 'Не удалось получить ответ.';
        container.scrollTop = container.scrollHeight;

    } catch (err) {
        aiMsgDiv.innerText = 'Ошибка связи с сервером.';
    }
});

function appendMessage(role, text, id = null) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-message`;
    if (id) msgDiv.id = id;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

document.querySelectorAll('.quick-btn').forEach(button => {
    button.addEventListener('click', function () {
        const input = document.getElementById('user-input');
        const form = document.getElementById('chat-form');
        input.value = this.textContent.replace(/^[^\w\sа-яА-Я]+\s*/, ''); // убирает эмодзи
        document.querySelector('.quick-questions').classList.add('hidden'); // скрываем после выбора
        form.dispatchEvent(new Event('submit'));
    });
});