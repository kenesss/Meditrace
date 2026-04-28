const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: String,
  full_name: String,
  password: String,
  githubId: String,
  resetToken: String,
  resetTokenExpiry: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  birth_date: { type: Date },
  weight: { type: Number },
  height: { type: Number },
});

module.exports = mongoose.model('user', UserSchema)