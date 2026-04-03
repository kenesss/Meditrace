const mongoose = require('mongoose');

const HealthGoalSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null },
  indicatorName: { type: String, required: true },
  targetValue:   { type: Number, required: true },
  direction: { type: String, enum: ['below', 'above'], required: true },
  // 'below' = хочу снизить до targetValue
  // 'above' = хочу повысить до targetValue
  unit: { type: String, default: '' },
  note: { type: String, default: '' },
  achieved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('HealthGoal', HealthGoalSchema);
