const express = require('express')
const session = require("express-session");
const mongooseStore = require("connect-mongo");
const passport = require('passport')
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const PDFParser = require("pdf2json");

const app = express()

// --- СТАРЫЙ БЛОК КОНФИГУРАЦИИ ---
require('./server/config/db')
require("./server/config/passport.js");

// --- НОВЫЙ БЛОК: СОЗДАНИЕ ПАПКИ ЗАГРУЗОК ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Создана папка для загрузок:', uploadDir);
}

// --- НОВЫЙ БЛОК: НАСТРОЙКА MULTER ---
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

// --- ОБЪЕДИНЕННЫЕ НАСТРОЙКИ ПРИЛОЖЕНИЯ ---
app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname));
app.use(express.urlencoded());
app.use(express.json()); 

app.use(
  session({
    name: "decodeblog.session",
    secret: "keyboard cat",
    maxAge: 1000 * 60 * 60 * 7,
    resave: false,
    store: mongooseStore.create({
      mongoUrl: "mongodb://localhost:27017",
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./server/pages/router"))
app.use(require("./server/Genres/router"));
app.use(require("./server/auth/router"));
app.use(require("./server/Blogs/router"));
app.use(require("./server/Comments/router"));
app.use(require("./server/Parser/router"));

// ФУНКЦИЯ ОБРАБОТКИ PDF
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
                pdfParser.on("pdfParser_dataReady", () => resolve());
                pdfParser.loadPDF(pdfPath);
            });
            const rawText = pdfParser.getRawTextContent();
            const lines = rawText.split('\n')
                .map(line => line.trim())
                .filter(line => {
                    return line.length > 0 && 
                           !line.startsWith("Warning:") && 
                           !line.includes("---Page") &&
                           !line.includes("Индивидуальный") &&
                           !line.includes("Науқас");
                });

            let allParsedData = [];
            const regex = /^([А-Яа-яA-Z\s.(),-]{3,})\s+(\d+[.,]?\d*)\s+([%|г\/л|млн\/мкл|фл|пг|г\/дл|тыс\/мкл|мм\/ч|нмоль\/л]+)\s+(.*)$/i;

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
                }
            });

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

        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

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

// --- НАСТРОЙКИ ШАБЛОНИЗАТОРА ---
app.set("view engine", "ejs")
app.set("public engine", "ejs") // Оставлено как было в первом коде
app.set('views', [path.join(__dirname, 'views'), __dirname]); // Поддержка обеих структур папок

// --- ЗАПУСК ---
const PORT = 8000 // Оставил порт 8000, так как он был в оригинале
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});