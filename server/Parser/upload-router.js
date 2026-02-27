const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// ИСПОЛЬЗУЕМ БОЛЕЕ МОЩНУЮ БИБЛИОТЕКУ
const PDFParser = require("pdf2json");

// ФИКС 1: Создаем папку uploads, если её нет
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Создана папка для загрузок:', uploadDir);
}

// Настройка multer для загузки файлов
const upload = multer({ 
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB лимит
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Только PDF файлы разрешены'), false);
    }
  }
});

// Маршрут для загрузки и обработки PDF
router.post('/upload', (req, res) => {
    upload.single('reportPdf')(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'Файл слишком большой (максимум 10MB)' });
            }
            return res.status(400).json({ success: false, error: 'Ошибка загрузки файла: ' + err.message });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, error: err.message });
        }
        
        // Если ошибок нет, продолжаем обработку
        handlePdfUpload(req, res);
    });
});

// Функция обработки PDF
async function handlePdfUpload(req, res) {
    let pdfPath = req.file ? req.file.path : null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Файл не выбран' });
        }

        console.log('Загружен файл:', req.file.originalname);

        let results = [];

        try {
            const pdfParser = new PDFParser(null, 1); 
            
            await new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", errData => reject(new Error(errData.parserError)));
                pdfParser.on("pdfParser_dataReady", () => resolve()); // Нам не нужен pdfData здесь
                pdfParser.loadPDF(pdfPath);
            });
            
            // ИСПРАВЛЕНИЕ: Вызываем getRawTextContent у pdfParser, как в твоем parser.js!
            const rawText = pdfParser.getRawTextContent();
            console.log("Длина извлеченного текста:", rawText.length, "символов");
            
            // 1. Разбиваем на строки и чистим мусор (твоя оригинальная логика)
            const lines = rawText.split('\n')
                .map(line => line.trim())
                .filter(line => {
                    return line.length > 0 && 
                           !line.startsWith("Warning:") && 
                           !line.includes("---Page") &&
                           !line.includes("Индивидуальный") &&
                           !line.includes("Науқас");
                });

            console.log("\n=== НАЙДЕННЫЕ ДАННЫЕ В PDF ===");
            
            let allParsedData = [];
            
            // ТВОЯ ОРИГИНАЛЬНАЯ И ИДЕАЛЬНО РАБОЧАЯ РЕГУЛЯРКА ИЗ parser.js
            const regex = /^([А-Яа-яA-Z\s.(),-]{3,})\s+(\d+[.,]?\d*)\s+([%|г\/л|млн\/мкл|фл|пг|г\/дл|тыс\/мкл|мм\/ч|нмоль\/л]+)\s+(.*)$/i;

            // 2. Парсим каждую строку
            lines.forEach(line => {
                const match = line.match(regex);
                if (match) {
                    const [_, name, value, unit, range] = match;
                    
                    allParsedData.push({
                        name: name.trim(),
                        val: parseFloat(value.replace(',', '.')), 
                        unit: unit.trim(),
                        reference: range.trim()
                    });
                    
                    console.log(`✓ ${name.trim()} | ${value} | ${unit}`);
                }
            });
            console.log("==============================\n");

            // 3. Выбираем только те анализы, которые нужны для графика
            const targetAnalyses = ['Тестостерон', 'Кортизол', 'Гемоглобин', 'Холестерин', 'Глюкоза', 'Лейкоциты'];
            
            results = targetAnalyses.map(targetName => {
                const found = allParsedData.find(item => item.name.toLowerCase().includes(targetName.toLowerCase()));
                if (found) {
                    return {
                        name: targetName,
                        val: found.val,
                        unit: found.unit,
                        reference: found.reference
                    };
                }
                return null;
            }).filter(item => item !== null);

        } catch (parseErr) {
            console.warn("Парсинг PDF не удался:", parseErr.message);
        }

        // Логируем финальный результат, который уйдет на сайт
        console.log("--- ИТОГОВЫЙ ОТВЕТ ДЛЯ САЙТА ---");
        results.forEach(item => console.log(`${item.name}: ${item.val} ${item.unit}`));
        console.log("--------------------------------\n");

        // Удаляем временный файл
        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        // Отправляем ответ на фронтенд
        res.json({
            success: true,
            date: req.body.testDate || new Date().toISOString().split('T')[0],
            testType: req.body.testType || "Invitro Report",
            results: results
        });

    } catch (error) {
        console.error("Критическая ошибка:", error);
        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = router;

router.get('/pdf-upload-page', (req, res) => {
    res.render('upload.ejs');
});