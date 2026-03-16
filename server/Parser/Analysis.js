const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    testDate: { type: Date, default: Date.now },
    testType: { type: String, default: "Invitro Report" },
    fileName: String,
    // Массив объектов: { name: "Гемоглобин", val: 140, unit: "г/л", reference: "130-160" }
    indicators: [{
        name: String,
        val: Number,
        unit: String,
        reference: String
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analysis', AnalysisSchema);