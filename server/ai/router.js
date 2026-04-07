const express = require('express');
const router = express.Router();
const { aiLimiter } = require('../config/limiters');
const { OpenAI } = require('openai');
const Analysis = require('../Parser/Analysis');
const HealthGoal = require('../goals/HealthGoal');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/api/ai/chat', aiLimiter, async (req, res) => {
    try {
        const { message } = req.body;
        // Пробуем все варианты получения ID пользователя
        const userId = req.user ? req.user._id : req.session.userId;

        if (!message) return res.status(400).json({ reply: "Сообщение пустое." });

        // 1. Ищем последние анализы в базе
        let medicalContext = "Данные анализов не найдены в базе.";
        if (userId) {
            // СТАЛО — несколько анализов с динамикой:
            const recentAnalyses = await Analysis.find({ userId })
                .sort({ testDate: -1 })
                .limit(3);

            if (recentAnalyses.length > 0) {
                medicalContext = recentAnalyses.map((a, i) =>
                    `Анализ ${i + 1} от ${a.testDate.toLocaleDateString('ru-RU')}:\n` +
                    a.indicators.map(ind =>
                        `  - ${ind.name}: ${ind.val} ${ind.unit} (Норма: ${ind.reference || 'не указана'})`
                    ).join('\n')
                ).join('\n\n');
                console.log(`✅ Контекст для ИИ сформирован (${recentAnalyses.length} анализов)`);
            } else {
                console.log("⚠️ Анализы для этого userId не найдены в БД");
            }
        } else {
            console.log("⚠️ User ID не определен, ИИ работает без контекста анализов");
        }

        let goalsContext = '';
        if (userId) {
            const userGoals = await HealthGoal.find({ userId, memberId: null });
            if (userGoals.length > 0) {
                goalsContext = '\n\nЦели здоровья пользователя:\n' + userGoals.map(g =>
                    `- ${g.indicatorName}: ${g.direction === 'below' ? 'снизить до' : 'повысить до'} ${g.targetValue} ${g.unit}${g.note ? ' (' + g.note + ')' : ''}`
                ).join('\n');
            }
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
            ${medicalContext}${goalsContext}
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

console.log('AI запрос получен:', message);

const completion = await openai.chat.completions.create({...messagesToAI, model: "gpt-4o", temperature: 0.7});
const aiReply = completion.choices[0].message.content;

// 5. Сохраняем в историю сессии только диалог (без системного промпта, так как он динамический)
req.session.chatHistory.push({ role: "user", content: message });
req.session.chatHistory.push({ role: "assistant", content: aiReply });

res.json({ reply: aiReply });

console.log('AI ответил');

module.exports = router;