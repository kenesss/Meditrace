const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const Analysis = require('../Parser/Analysis'); 

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/api/ai/chat', async (req, res) => {
    try {
        const { message } = req.body;
        // Пробуем все варианты получения ID пользователя
        const userId = req.user ? req.user._id : req.session.userId;

        if (!message) return res.status(400).json({ reply: "Сообщение пустое." });

        // 1. Ищем последние анализы в базе
        let medicalContext = "Данные анализов не найдены в базе.";
        if (userId) {
            const lastAnalysis = await Analysis.findOne({ userId }).sort({ testDate: -1 });
            
            if (lastAnalysis && lastAnalysis.indicators.length > 0) {
                medicalContext = "Результаты последних анализов пользователя:\n";
                lastAnalysis.indicators.forEach(ind => {
                    medicalContext += `- ${ind.name}: ${ind.val} ${ind.unit} (Норма: ${ind.reference || 'не указана'})\n`;
                });
                console.log(`✅ Контекст для ИИ сформирован (${lastAnalysis.indicators.length} показателей)`);
            } else {
                console.log("⚠️ Анализы для этого userId не найдены в БД");
            }
        } else {
            console.log("⚠️ User ID не определен, ИИ работает без контекста анализов");
        }

        // 2. Инициализируем историю, если её нет
        if (!req.session.chatHistory) {
            req.session.chatHistory = [];
        }

        // 3. ФОРМИРУЕМ ПАКЕТ СООБЩЕНИЙ ДЛЯ OPENAI
        // Мы всегда ставим свежий системный промпт первым
        const systemPrompt = { 
            role: "system", 
            content: `Ты — медицинский ассистент Meditrace. Твои знания базируются на следующих данных пользователя:
            ${medicalContext}
            Инструкции: Будь профессионален. Если есть отклонения от нормы, укажи на них. Всегда советуй обратиться к врачу.` 
        };

        // Собираем историю: Системный промпт + последние сообщения из сессии
        const messagesToAI = [
            systemPrompt,
            ...req.session.chatHistory.slice(-10) // Берем последние 10 сообщений для памяти
        ];
        
        // Добавляем текущее сообщение пользователя
        messagesToAI.push({ role: "user", content: message });

        // 4. Запрос к OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messagesToAI,
            temperature: 0.7,
        });

        const aiReply = completion.choices[0].message.content;

        // 5. Сохраняем в историю сессии только диалог (без системного промпта, так как он динамический)
        req.session.chatHistory.push({ role: "user", content: message });
        req.session.chatHistory.push({ role: "assistant", content: aiReply });

        res.json({ reply: aiReply });

    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ reply: "Произошла ошибка в работе мозга ИИ." });
    }
});

module.exports = router;