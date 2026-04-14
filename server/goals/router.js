const express = require('express');
const router = express.Router();
const HealthGoal = require('./HealthGoal');
const Analysis = require('../Parser/Analysis');
const { isAuth } = require('../auth/middlewares');

// Получить все цели пользователя с прогрессом
router.get('/api/goals', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const memberId = req.query.member || null;
    const goals = await HealthGoal.find({ userId, memberId }).sort({ createdAt: -1 });

    // Для каждой цели найти последнее значение из анализов
    const analysisQuery = memberId ? { userId, memberId } : { userId, memberId: null };
    const lastAnalysis = await Analysis.findOne(analysisQuery).sort({ testDate: -1 });

    const indicatorMap = new Map(
      lastAnalysis?.indicators?.map(i => [i.name.toLowerCase(), i]) ?? []
    );


    const goalsWithProgress = goals.map(goal => {
      const ind = indicatorMap.get(goal.indicatorName.toLowerCase());
      const currentVal = ind?.val ?? null;

      let progress = null;
      let achieved = false;
      if (currentVal !== null) {
        if (goal.direction === 'below') {
          achieved = currentVal <= goal.targetValue;
          // прогресс: насколько приблизились (0-100%)
          // если стартовое значение неизвестно, показываем текущее vs цель
          progress = achieved ? 100 : Math.max(0, Math.min(99,
            Math.round((1 - (currentVal - goal.targetValue) / (currentVal + 0.001)) * 100)
          ));
        } else {
          achieved = currentVal >= goal.targetValue;
          progress = achieved ? 100 : Math.max(0, Math.min(99,
            Math.round((currentVal / goal.targetValue) * 100)
          ));
        }
      }

      return {
        ...goal.toObject(),
        currentVal,
        progress,
        achieved,
      };
    });

    res.json({ success: true, goals: goalsWithProgress });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Создать цель
router.post('/api/goals', isAuth, async (req, res) => {
  try {
    const { indicatorName, targetValue, direction, unit, note, memberId } = req.body;
    if (!indicatorName || targetValue == null || !direction) {
      return res.status(400).json({ success: false, error: 'Заполните все поля' });
    }
    const goal = await new HealthGoal({
      userId: req.user._id,
      memberId: memberId || null,
      indicatorName,
      targetValue: parseFloat(targetValue),
      direction,
      unit: unit || '',
      note: note || '',
    }).save();
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Удалить цель
router.delete('/api/goals/:id', isAuth, async (req, res) => {
  try {
    await HealthGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
