const express = require('express');
const multer = require('multer');
const { uploadLimiter } = require('../config/limiters');
const router = express.Router();

const Analysis = require('./Analysis');
const FamilyMember = require('../family/FamilyMember');

const PDFParser = require('pdf2json');

// ─── Константы на уровне модуля (создаются один раз) ──────────────────────────

const TARGET_ANALYSES = [
    'Тестостерон', 'Кортизол', 'Гемоглобин', 'Холестерин', 'Глюкоза', 'Лейкоциты',
    'Эритроциты', 'Тромбоциты', 'Гематокрит', 'MCV', 'MCH', 'MCHC', 'RDW',
    'Нейтрофилы', 'Лимфоциты', 'Моноциты', 'Эозинофилы', 'Базофилы',
    'СОЭ', 'СРБ', 'Креатинин', 'Мочевина', 'Мочевая кислота',
    'Билирубин общий', 'Билирубин прямой', 'АЛТ', 'АСТ', 'ЩФ', 'ГГТ',
    'Белок общий', 'Альбумин', 'Калий', 'Натрий', 'Хлор', 'Железо',
    'Тиреотропин', 'Витамин D', 'Инсулин', 'Гликированный гемоглобин',
];

// Компилируется один раз при старте сервера, а не на каждый запрос
const INDICATOR_REGEX = /^(.*?)\s+(\d+[.,]?\d*)\s+(%|г\/л|млн\/мкл|фл|пг|г\/дл|тыс\/мкл|мм\/ч|нмоль\/л|ммоль\/л|мкмоль\/л|мкг\/л|мг\/дл|нг\/мл|мед\/л|ед\/л|ме\/л)(?:\s+(.*))?$/i;

// ─── Настройка multer ──────────────────────────────────────────────────────────

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Только PDF файлы разрешены'), false);
        }
    },
});

// ─── Вспомогательные функции ───────────────────────────────────────────────────

// Нормализация для нечёткого поиска по названию показателя
const normalize = (str) =>
    str.toLowerCase()
        .replace(/м/g, 'm')
        .replace(/с/g, 'c')
        .replace(/н/g, 'h')
        .replace(/о/g, 'o');

// Парсинг PDF из буфера памяти — без записи на диск
function parsePdfBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on('pdfParser_dataError', (errData) =>
            reject(new Error(errData.parserError))
        );
        pdfParser.on('pdfParser_dataReady', () =>
            resolve(pdfParser.getRawTextContent())
        );
        // parseBuffer вместо loadPDF — не нужен временный файл
        pdfParser.parseBuffer(buffer);
    });
}

// Извлечение показателей из сырого текста PDF
function extractIndicators(rawText) {
    const lines = rawText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.includes('---Page') && !line.match(/^\d+$/));

    const allParsedData = [];
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
        if (skipNext) {
            skipNext = false;
            continue;
        }

        let cleanLine = lines[i].replace(/ᴺᴬ|NA/g, '').trim();
        cleanLine = cleanLine.replace(/\)(\d+[.,]?\d*)/g, ') $1');
        cleanLine = cleanLine.replace(/\s{2,}/g, ' ');

        let match = cleanLine.match(INDICATOR_REGEX);

        // Если не совпало — пробуем объединить со следующей строкой
        if (!match && i < lines.length - 1) {
            const nextLine = lines[i + 1].replace(/ᴺᴬ|NA/g, '').trim();
            const combined = (cleanLine + ' ' + nextLine).replace(/\s{2,}/g, ' ');
            match = combined.match(INDICATOR_REGEX);
            if (match) skipNext = true;
        }

        if (match) {
            const [, name, value, unit, range] = match;
            let cleanName = name
                .replace(/^\(Комментарий\)\s*/i, '')
                .trim()
                .replace(/^[^\wа-яА-ЯёЁ]+|[^\wа-яА-ЯёЁ]+$/g, '');

            if (name.toLowerCase().includes('соэ')) cleanName = 'СОЭ';

            if (cleanName.length > 1 && !cleanName.includes('ISSAM')) {
                allParsedData.push({
                    name: cleanName,
                    val: parseFloat(value.replace(',', '.')),
                    unit: unit.trim(),
                    reference: range ? range.trim() : '',
                });
            }
        }
    }

    // Оставляем только целевые показатели
    return TARGET_ANALYSES.map((target) => {
        const found = allParsedData.find((item) => {
            const iName = normalize(item.name);
            const tName = normalize(target);
            // Гликированный гемоглобин не должен попасть в "Гемоглобин"
            if (tName === 'гемоглобин' && iName.includes('гликирован')) return false;
            return iName.includes(tName);
        });
        return found
            ? { name: target, val: found.val, unit: found.unit, reference: found.reference }
            : null;
    }).filter(Boolean);
}

// ─── Роуты ────────────────────────────────────────────────────────────────────

// POST /upload — загрузка и парсинг PDF-анализа
router.post('/upload', uploadLimiter, (req, res) => {
    upload.single('reportPdf')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'Файл слишком большой (максимум 10MB)',
                });
            }
            return res.status(400).json({
                success: false,
                error: 'Ошибка загрузки файла: ' + err.message,
            });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, error: err.message });
        }
        handlePdfUpload(req, res);
    });
});

async function handlePdfUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Файл не выбран' });
        }

        console.log('Загружен файл:', req.file.originalname);

        const userId = req.user ? req.user._id : req.session.userId;

        // Проверяем принадлежность члена семьи текущему пользователю
        let memberId = req.body.memberId || null;
        if (memberId && userId) {
            const member = await FamilyMember.findOne({ _id: memberId, ownerId: userId });
            if (!member) memberId = null;
        } else {
            memberId = null;
        }

        // Парсим PDF прямо из буфера — без создания временного файла на диске
        const rawText = await parsePdfBuffer(req.file.buffer);
        const results = extractIndicators(rawText);

        // Сохраняем в БД
        if (userId && results.length > 0) {
            const newAnalysis = new Analysis({
                userId,
                memberId,
                testDate: req.body.testDate || new Date(),
                testType: req.body.testType || 'Invitro Report',
                fileName: req.file.originalname,
                indicators: results,
            });
            await newAnalysis.save();
            console.log(`✅ Анализ сохранён в БД для пользователя: ${userId}`);
        } else {
            console.log('⚠️ Анализ не сохранён: нет userId или пустые результаты');
        }

        res.json({
            success: true,
            date: req.body.testDate || new Date().toISOString().split('T')[0],
            testType: req.body.testType || 'Invitro Report',
            results,
        });
    } catch (error) {
        console.error('Критическая ошибка при обработке PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /pdf-upload-page/:id? — страница загрузки анализа
router.get('/pdf-upload-page/:id?', async (req, res) => {
    try {
        const familyMembers = req.user
            ? await FamilyMember.find({ ownerId: req.user._id }).sort({ createdAt: 1 })
            : [];
        res.render('upload', {
            user: req.user || {},
            familyMembers,
            activeMemberId: req.query.member || null,
            activePage: 'analyses',
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// DELETE /delete-analysis/:id — удаление анализа
router.delete('/delete-analysis/:id', async (req, res) => {
    try {
        const userId = req.user ? req.user._id : req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Необходима авторизация' });
        }

        const deleted = await Analysis.findOneAndDelete({
            _id: req.params.id,
            userId,
        });

        if (deleted) {
            console.log(`🗑️ Анализ ${req.params.id} удалён`);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Анализ не найден или нет прав' });
        }
    } catch (error) {
        console.error('Ошибка при удалении анализа:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /analyses/history — последние 5 анализов пользователя
router.get('/analyses/history', async (req, res) => {
    try {
        const userId = req.user ? req.user._id : req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Необходима авторизация' });
        }

        const analyses = await Analysis.find({ userId })
            .sort({ testDate: -1 })
            .limit(5);

        res.json({ success: true, analyses });
    } catch (error) {
        console.error('Ошибка при получении истории:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/compare-analyses?id1=&id2= — сравнение двух анализов
router.get('/api/compare-analyses', async (req, res) => {
    try {
        const { id1, id2 } = req.query;
        const userId = req.user ? req.user._id : req.session.userId;

        if (!userId) return res.status(401).json({ success: false, error: 'Не авторизован' });
        if (!id1 || !id2) return res.status(400).json({ success: false, error: 'Нужно передать id1 и id2' });

        const [a1, a2] = await Promise.all([
            Analysis.findOne({ _id: id1, userId }),
            Analysis.findOne({ _id: id2, userId }),
        ]);

        if (!a1 || !a2) {
            return res.status(404).json({ success: false, error: 'Анализ не найден' });
        }

        // Объединяем названия показателей из обоих анализов
        const allNames = [...new Set([
            ...a1.indicators.map((i) => i.name),
            ...a2.indicators.map((i) => i.name),
        ])];

        const delta = allNames.map((name) => {
            const ind1 = a1.indicators.find((i) => i.name === name);
            const ind2 = a2.indicators.find((i) => i.name === name);
            const val1 = ind1 ? ind1.val : null;
            const val2 = ind2 ? ind2.val : null;
            const diff =
                val1 !== null && val2 !== null
                    ? parseFloat((val2 - val1).toFixed(3))
                    : null;
            const unit = (ind1 || ind2)?.unit || '';
            const reference = (ind1 || ind2)?.reference || '';
            return { name, val1, val2, diff, unit, reference };
        });

        res.json({
            success: true,
            report1: { id: a1._id, fileName: a1.fileName, date: a1.testDate },
            report2: { id: a2._id, fileName: a2.fileName, date: a2.testDate },
            delta,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;