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