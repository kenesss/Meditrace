document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('user-input');
    const container = document.getElementById('chat-messages');
    const text = input.value.trim();

    if (!text) return;

    // 1. Добавляем сообщение пользователя
    appendMessage('user', text);
    input.value = '';

    // 2. Создаём пустой блок для ответа AI — будем заполнять по частям
    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.className = 'message ai-message';
    aiMsgDiv.innerText = 'Печатает...';
    container.appendChild(aiMsgDiv);
    container.scrollTop = container.scrollHeight;

    const data = await response.json();
    aiMsgDiv.innerText = data.reply || 'Не удалось получить ответ.';

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
    button.addEventListener('click', function() {
        const input = document.getElementById('user-input');
        const form = document.getElementById('chat-form');
        input.value = this.textContent;
        form.dispatchEvent(new Event('submit'));
    });
});
});