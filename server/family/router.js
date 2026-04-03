const express = require('express');
const router = express.Router();
const FamilyMember = require('./FamilyMember');
const { isAuth } = require('../auth/middlewares');

// Получить всех членов семьи текущего пользователя
router.get('/api/family', isAuth, async (req, res) => {
  try {
    const members = await FamilyMember.find({ ownerId: req.user._id }).sort({ createdAt: 1 });
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Добавить члена семьи
router.post('/api/family', isAuth, async (req, res) => {
  try {
    const { full_name, relationship, themeColor } = req.body;
    if (!full_name || !relationship) {
      return res.status(400).json({ success: false, error: 'Имя и роль обязательны' });
    }
    const member = await new FamilyMember({
      ownerId: req.user._id,
      full_name,
      relationship,
      themeColor: themeColor || 'purple',
    }).save();
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Удалить члена семьи
router.delete('/api/family/:id', isAuth, async (req, res) => {
  try {
    const deleted = await FamilyMember.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!deleted) return res.status(404).json({ success: false, error: 'Не найден' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
