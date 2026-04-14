// const express = require('express');
// const router = express.Router();
// const { aiLimiter } = require('../config/limiters');
// const { OpenAI } = require('openai');
// const Analysis = require('../Parser/Analysis');
// const HealthGoal = require('../goals/HealthGoal');

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//     timeout: 30000,
// });

// router.post('/api/ai/chat', aiLimiter, async (req, res) => {
//     try {
//         const { message } = req.body;
//         const userId = req.user ? req.user._id : req.session.userId;

//         if (!message) return res.status(400).json({ reply: "Сообщение пустое." });

//         let medicalContext = "Данные анализов не найдены в базе.";
//         if (userId) {
//             const recentAnalyses = await Analysis.find({ userId })
//                 .sort({ testDate: -1 })
//                 .limit(3);

//             if (recentAnalyses.length > 0) {
//                 medicalContext = recentAnalyses.map((a, i) =>
//                     `Анализ ${i + 1} от ${a.testDate.toLocaleDateString('ru-RU')}:\n` +
//                     a.indicators.map(ind =>
//                         `  - ${ind.name}: ${ind.val} ${ind.unit} (Норма: ${ind.reference || 'не указана'})`
//                     ).join('\n')
//                 ).join('\n\n');
//                 console.log(`✅ Контекст для ИИ сформирован (${recentAnalyses.length} анализов)`);
//             }
//         }

//         let goalsContext = '';
//         if (userId) {
//             const userGoals = await HealthGoal.find({ userId, memberId: null });
//             if (userGoals.length > 0) {
//                 goalsContext = '\n\nЦели здоровья пользователя:\n' + userGoals.map(g =>
//                     `- ${g.indicatorName}: ${g.direction === 'below' ? 'снизить до' : 'повысить до'} ${g.targetValue} ${g.unit}${g.note ? ' (' + g.note + ')' : ''}`
//                 ).join('\n');
//             }
//         }

//         if (!req.session.chatHistory) {
//             req.session.chatHistory = [];
//         }

//         const systemPrompt = {
//             role: "system",
//             content: `Ты — медицинский ассистент Meditrace. Твои знания базируются на следующих данных пользователя:
//             ${medicalContext}${goalsContext}
//             Инструкции: Будь профессионален. Если есть отклонения от нормы, укажи на них. Всегда советуй обратиться к врачу.`
//         };

//         const messagesToAI = [
//             systemPrompt,
//             ...req.session.chatHistory.slice(-10)
//         ];

//         messagesToAI.push({ role: "user", content: message });

//         console.log('AI запрос отправляется...');

//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o",
//             messages: messagesToAI,
//             temperature: 0.7,
//         });

//         console.log('AI ответил успешно');

//         const aiReply = completion.choices[0].message.content;

//         req.session.chatHistory.push({ role: "user", content: message });
//         req.session.chatHistory.push({ role: "assistant", content: aiReply });

//         res.json({ reply: aiReply });

//     } catch (error) {
//         console.error('OpenAI Error full:', error.message, error.status, error.code);
//         res.status(500).json({ reply: "Произошла ошибка в работе мозга ИИ." });
//     }
// });

// module.exports = router;