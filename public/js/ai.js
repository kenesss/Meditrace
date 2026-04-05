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

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        // 3. Читаем стрим по частям
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.text) {
                        if (isFirst) {
                            aiMsgDiv.innerText = '';  // убираем "Печатает..."
                            isFirst = false;
                        }
                        fullText += parsed.text;
                        aiMsgDiv.innerText = fullText;
                        container.scrollTop = container.scrollHeight;
                    }
                } catch (e) {
                    // неполный chunk, пропускаем
                }
            }
        }

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
    button.addEventListener('click', function() {
        const input = document.getElementById('user-input');
        const form = document.getElementById('chat-form');
        input.value = this.textContent;
        form.dispatchEvent(new Event('submit'));
    });
});