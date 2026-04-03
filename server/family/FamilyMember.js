const mongoose = require('mongoose');

const FamilyMemberSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  full_name: { type: String, required: true },
  relationship: { type: String, required: true },
  themeColor: { type: String, default: 'purple' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);
