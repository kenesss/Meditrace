const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const Genres = require('../Genres/Genres');
const User = require('../auth/User');
const Blog = require('../Blogs/blog');
const Comment = require("../Comments/Comments");

// ИСПОЛЬЗУЕМ БОЛЕЕ МОЩНУЮ БИБЛИОТЕКУ
const PDFParser = require("pdf2json");

// Настройка multer для работы с памятью (не сохраняет файл на диск)
const storage = multer.memoryStorage(); 
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
    upload.single('reportPdf')(req, res, function (err) {
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

    try {

        if (!req.file) {

            return res.status(400).json({ success: false, error: 'Файл не выбран' });

        }



        console.log('Загружен файл:', req.file.originalname);

        console.log('User ID from session:', req.session.userId);

        console.log('Is temp user:', req.session.isTempUser);

        console.log('File size:', req.file.buffer.length, 'bytes');



        let results = [];



        try {

            const pdfParser = new PDFParser(null, 1);



            // Создаем временный файл для парсинга (pdf2json требует файл)

            const tempPath = path.join(__dirname, '../../temp_' + Date.now() + '.pdf');

            require('fs').writeFileSync(tempPath, req.file.buffer);



            await new Promise((resolve, reject) => {

                pdfParser.on("pdfParser_dataError", errData => reject(new Error(errData.parserError)));

                pdfParser.on("pdfParser_dataReady", () => resolve());

                pdfParser.loadPDF(tempPath);

            });



            const rawText = pdfParser.getRawTextContent();

            console.log("Длина извлеченного текста:", rawText.length, "символов");



            // Удаляем временный файл

            require('fs').unlinkSync(tempPath);



            // Парсинг биомаркеров

            const lines = rawText.split('\n')

                .map(line => line.trim())

                .filter(line => {

                    return line.length > 0 &&

                        !line.startsWith("Warning:") &&

                        !line.includes("---Page") &&

                        !line.includes("Индивидуальный") &&

                        !line.includes("Науқас") &&

                        !line.includes("PAGE") &&

                        !line.includes("Page") &&

                        !line.match(/^\d+$/) && // Убираем строки с только цифрами

                        !line.match(/^[A-ZА-ЯЁё]+$/i); // Убираем строки с только заголовками

                });



            // Расширенный список анализов для поиска

            const targetAnalyses = [

                'Тестостерон', 'Кортизол', 'Гемоглобин', 'Холестерин', 'Глюкоза', 'Лейкоциты',

                'Эритроциты', 'Тромбоциты', 'Гематокрит', 'MCV', 'MCH', 'MCHC', 'RDW',

                'Нейтрофилы', 'Лимфоциты', 'Моноциты', 'Эозинофилы', 'Базофилы',

                'СОЭ', 'СРБ', 'Креатинин', 'Мочевина', 'Мочевая кислота',

                'Билирубин общий', 'Билирубин прямой', 'Билирубин непрямой',

                'АЛТ', 'АСТ', 'ЩФ', 'ГГТ', 'Амилаза',

                'Белок общий', 'Альбумин', 'Калий', 'Натрий', 'Хлор',

                'Кальций', 'Фосфор', 'Магний', 'Железо',

                'Тиреотропин', 'Т3 свободный', 'Т4 свободный', 'Т4 общий',

                'Пролактин', 'Эстрадиол', 'Прогестерон', 'ФСГ', 'ЛГ',

                'Витамин D', 'Витамин B12', 'Фолиевая кислота',

                'Триглицериды', 'ЛПНП', 'ЛПВП', 'ЛПОНП',

                'С-реактивный белок', 'Фибриноген', 'D-димер',

                'Инсулин', 'С-пептид', 'Гликированный гемоглобин'

            ];



            // 1. ИСПРАВЛЕННАЯ РЕГУЛЯРКА:

            // (.*?) - берет любые символы в названии (включая запятые и скобки)

            // круглые скобки (...) для точного совпадения единиц измерения

            const regex = /^(.*?)\s+(\d+[.,]?\d*)\s+(%|г\/л|млн\/мкл|фл|пг|г\/дл|тыс\/мкл|мм\/ч|нмоль\/л|ммоль\/л|мкмоль\/л|мкг\/л|мг\/дл|нг\/мл|мед\/л|ед\/л|т\/год|г\/%|мк\/л|ме\/л)(?:\s+(.*))?$/i;



            let allParsedData = [];
            let skipNext = false; // Флаг для пропуска склеенных строк

            // Проходим по строкам
            for (let i = 0; i < lines.length; i++) {
                if (skipNext) {
                    skipNext = false;
                    continue; 
                }

                // Убираем надстрочные знаки и чистим мусор
                let cleanLine = lines[i]
                    .replace(/ᴺᴬ/g, '')
                    .replace(/NA/g, '')
                    .replace(/^Клинический анализ крови\s*/i, '') 
                    .trim();
                
                // РАЗЛЕПЛЯЕМ слипшиеся скобки и цифры (например: "эр.)34.9" превращаем в "эр.) 34.9")
                cleanLine = cleanLine.replace(/\)(\d+[.,]?\d*)/g, ') $1');
                
                // Схлопываем множественные пробелы
                cleanLine = cleanLine.replace(/\s{2,}/g, ' ');

                let match = cleanLine.match(regex);
                
                let usedCombined = false;
                let combinedLineStr = "";

                // Пробуем склеить текущую строку со следующей
                if (!match && i < lines.length - 1) {
                    let nextCleanLine = lines[i+1].replace(/ᴺᴬ/g, '').replace(/NA/g, '').trim();
                    nextCleanLine = nextCleanLine.replace(/\)(\d+[.,]?\d*)/g, ') $1'); // Тоже разлепляем
                    combinedLineStr = cleanLine + " " + nextCleanLine;
                    match = combinedLineStr.replace(/\s{2,}/g, ' ').match(regex);
                    
                    if (match) {
                        skipNext = true; 
                        usedCombined = true;
                    }
                }

                if (match) {
                    let [_, name, value, unit, range] = match;
                    
                    let cleanName = name
                        .replace(/^\(Комментарий\)\s*/i, '') 
                        .trim(); 
                    
                    // Железобетонный хак для СОЭ (ищем по оригинальному сырому имени)
                    if (name.toLowerCase().includes('седиментацион') || name.toLowerCase().includes('соэ')) {
                        cleanName = 'СОЭ';
                    }

                    // Убираем оставшийся мусор по краям (например, висящие двоеточия)
                    cleanName = cleanName.replace(/^[^\wа-яА-ЯёЁ]+|[^\wа-яА-ЯёЁ]+$/g, ''); 

                    // Пропускаем мусор от ISSAM и проверяем длину
                    if (cleanName.length > 1 && !cleanName.includes('ISSAM')) {
                        allParsedData.push({
                            name: cleanName,
                            val: parseFloat(value.replace(',', '.')),
                            unit: unit.trim(),
                            reference: range ? range.trim() : ''
                        });
                    }
                }
            }

            console.log(`\n=== НАЙДЕНО БИОМАРКЕРОВ: ${allParsedData.length} ===`);
            allParsedData.forEach((item, index) => {
                console.log(`${index + 1}. ${item.name}: ${item.val} ${item.unit} ${item.reference ? '(' + item.reference + ')' : ''}`);
            });
            console.log("=====================================\n");

            // Функция для унификации похожих букв кириллицы и латиницы (МСНС / MCHC)
            const normalizeLetters = (str) => {
                return str.toLowerCase()
                    .replace(/м/g, 'm').replace(/с/g, 'c')
                    .replace(/н/g, 'h').replace(/в/g, 'v')
                    .replace(/о/g, 'o').replace(/а/g, 'a')
                    .replace(/р/g, 'p').replace(/е/g, 'e')
                    .replace(/х/g, 'x');
            };

            // УМНЫЙ ПОИСК ЦЕЛЕВЫХ АНАЛИЗОВ
            results = targetAnalyses.map(targetName => {
                const found = allParsedData.find(item => {
                    // Пропускаем названия через "переводчик" перед сравнением
                    const iName = normalizeLetters(item.name);
                    const tName = normalizeLetters(targetName);

                    // Строгая проверка: если ищем обычный гемоглобин, отсекаем гликированный
                    if (tName === 'гемоглобин' && iName.includes('гликирован')) return false;
                    
                    return iName.includes(tName);
                });

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

            // Если целевых анализов мало, добавляем первые 10 найденных
            if (results.length < 5 && allParsedData.length > results.length) {
                const additionalAnalyses = allParsedData
                    .filter(item => !results.some(r => r.name.toLowerCase() === item.name.toLowerCase()))
                    .slice(0, 10 - results.length)
                    .map(item => ({
                        name: item.name,
                        val: item.val,
                        unit: item.unit,
                        reference: item.reference
                    }));
                
                results = [...results, ...additionalAnalyses];
            }



        } catch (parseErr) {

            console.warn("Парсинг PDF не удался:", parseErr.message);

        }

        // Логируем финальный результат, который уйдет на сайт
        console.log("--- ИТОГОВЫЙ ОТВЕТ ДЛЯ САЙТА ---");
        results.forEach(item => console.log(`${item.name}: ${item.val} ${item.unit}`));
        console.log("--------------------------------\n");

        // Отправляем ответ на фронтенд
        res.json({
            success: true,
            date: req.body.testDate || new Date().toISOString().split('T')[0],
            testType: req.body.testType || "Invitro Report",
            results: results
        });

    } catch (error) {
        console.error("Критическая ошибка:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}

router.get("/pdf-upload-page/:id?", async function (req, res) {
    try {
        res.render("upload", { 
            user: req.user ? req.user : {}, 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;