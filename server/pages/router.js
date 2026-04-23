const express = require('express')
const router = express.Router();
const User = require('../auth/User')
const openai = require('../config/openai');
const Analysis = require('../Parser/Analysis');
const FamilyMember = require('../family/FamilyMember');
const HealthGoal = require('../goals/HealthGoal');
const { isAuth } = require('../auth/middlewares');

function getStatus(val, reference) {
  const noData = { label: 'Нет данных', color: '#6b7280', bg: '#f9fafb' };
  if (reference == null || String(reference).trim() === '') return noData;
  const parts = String(reference).trim().split('-');
  if (parts.length !== 2) return noData;
  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);
  if (Number.isNaN(min) || Number.isNaN(max)) return noData;
  const numVal = typeof val === 'number' ? val : parseFloat(val);
  if (Number.isNaN(numVal)) return noData;
  if (numVal < min) return { label: 'Ниже нормы', color: '#2563eb', bg: '#eff6ff' };
  if (numVal > max) return { label: 'Выше нормы', color: '#dc2626', bg: '#fef2f2' };
  return { label: 'В норме', color: '#16a34a', bg: '#f0fdf4' };
}

router.get('/', async (req, res) => {
  res.render("index", { 
    user: req.user ? req.user : {},
    isLanding: true  // ← добавьте это
  });
});


router.get("/login", (req, res) => {
  res.render("login", {
    user: req.user ? req.user : {},
    query: req.query,
    githubAuthEnabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  });
});
router.get("/regester", (req, res) => {
  res.render("regester", { user: req.user ? req.user : {}, query: req.query });
});


router.get("/profile/:id", isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      const memberId = req.query.member || null;
      const analysisQuery = memberId
        ? { userId: req.params.id, memberId: memberId }
        : { userId: req.params.id, memberId: null };
      const analyses = await Analysis.find(analysisQuery).sort({ testDate: -1 }).lean();

      const familyMembers = await FamilyMember.find({ ownerId: req.params.id }).sort({ createdAt: 1 });

      const activeMember = memberId
        ? await FamilyMember.findById(memberId)
        : null;

      analyses.forEach(a => {
        a.indicators.forEach(ind => {
          ind.status = getStatus(ind.val, ind.reference);
        });
      });

      const goals = await HealthGoal.find({
        userId: req.params.id,
        memberId: memberId || null,
      }).sort({ createdAt: -1 });

      const goalsWithProgress = goals.map(goal => {
        const latestAnalysis = analyses[0];
        const ind = latestAnalysis?.indicators?.find(
          i => i.name.toLowerCase() === goal.indicatorName.toLowerCase()
        );
        const currentVal = ind ? ind.val : null;
        let progress = null;
        let achieved = false;
        if (currentVal !== null) {
          if (goal.direction === 'below') {
            achieved = currentVal <= goal.targetValue;
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
        return { ...goal.toObject(), currentVal, progress, achieved };
      });

      const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
      let reminderBanner = null;
      if (analyses.length > 0) {
        const lastDate = new Date(analyses[0].testDate);
        const msSinceLast = Date.now() - lastDate.getTime();
        const monthsSinceLast = Math.floor(msSinceLast / (30 * 24 * 60 * 60 * 1000));
        if (msSinceLast > SIX_MONTHS_MS) {
          reminderBanner = {
            months: monthsSinceLast,
            lastDate: lastDate.toLocaleDateString('ru-RU'),
          };
        }
      } else {
        reminderBanner = { months: null, lastDate: null };
      }

      // ── Подсчёт процента заполненности профиля ──
      const fields = [
        user.full_name,
        user.email,
        user.gender,
        user.birth_date,
        user.weight,
        user.height,
      ];
      const filled = fields.filter(f => f !== null && f !== undefined && f !== '').length;
      const profileHealth = Math.round((filled / fields.length) * 100) + '%';

      res.render("profile", {
        user: user,
        loginUser: req.user,
        analyses: analyses,
        familyMembers: familyMembers,
        activeMember: activeMember,
        activeMemberId: memberId,
        goals: goalsWithProgress,
        reminderBanner: reminderBanner,
        activePage: 'home',
        // ── Новые переменные для статкарточек ──
        analysesCount: String(analyses.length).padStart(2, '0'),
        familyCount: String(familyMembers.length).padStart(2, '0'),
        goalsCount: String(goals.length).padStart(2, '0'),
        profileHealth: profileHealth,
      });
    } else {
      res.redirect("/not-found");
    }
  } catch (error) {
    console.error("Ошибка при загрузке профиля:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/forgot", (req, res) => {
  res.render("forgot", { user: req.user ? req.user : {}, query: req.query });
});

router.get("/debug/users", isAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/not-found", (req, res) => {
  res.render("notFound");
})

router.get("/add-members/:id", isAuth, async function (req, res) {
  try {
    const familyMembers = await FamilyMember.find({ ownerId: req.user._id });

    res.render("addMembers", {
      user: req.user ? req.user : {},
      familyMembers: familyMembers,
      activeMemberId: req.query.member || null,
      activePage: 'members',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.get("/setting/:id", isAuth, async function (req, res) {
  const user = await User.findById(req.params.id);
  if (user) {
    const familyMembers = await FamilyMember.find({ ownerId: req.user._id }).sort({ createdAt: 1 });
    res.render("setting", {
      user: user,
      loginUser: req.user,
      familyMembers: familyMembers,
      activeMemberId: req.query.member || null,
      query: req.query,
      activePage: 'settings',
    });
  } else {
    res.redirect("/not-found");
  }
});
router.get("/ai/:id", isAuth, async function (req, res) {
  const user = await User.findById(req.params.id);
  if (user) {
    const familyMembers = await FamilyMember.find({ ownerId: req.user._id }).sort({ createdAt: 1 });
    res.render("ai", {
      user: user,
      loginUser: req.user,
      familyMembers: familyMembers,
      activeMemberId: req.query.member || null,
      activePage: 'ai',
    });
  } else {
    res.redirect("/not-found");
  }
});

router.get("/comparison/:id", isAuth, async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect("/not-found");

    const memberId = req.query.member || null;
    const analysisQuery = memberId
      ? { userId: req.params.id, memberId: memberId }
      : { userId: req.params.id, memberId: null };

    const analyses = await Analysis.find(analysisQuery).sort({ testDate: -1 }).lean();

    analyses.forEach(a => {
      a.indicators.forEach(ind => {
        ind.status = getStatus(ind.val, ind.reference);
      });
    });

    const familyMembers = await FamilyMember.find({ ownerId: req.params.id }).sort({ createdAt: 1 });

    res.render("comparison", {
      user,
      loginUser: req.user,
      analyses,
      familyMembers,
      activeMemberId: memberId,
      activePage: 'comparison',
    });
  } catch (error) {
    console.error("Ошибка при загрузке страницы сравнения:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/goals/:id", isAuth, async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect("/not-found");

    const memberId = req.query.member || null;
    const analysisQuery = memberId
      ? { userId: req.params.id, memberId: memberId }
      : { userId: req.params.id, memberId: null };

    const analyses = await Analysis.find(analysisQuery).sort({ testDate: -1 }).lean();

    analyses.forEach(a => {
      a.indicators.forEach(ind => {
        ind.status = getStatus(ind.val, ind.reference);
      });
    });

    const goals = await HealthGoal.find({
      userId: req.params.id,
      memberId: memberId || null,
    }).sort({ createdAt: -1 });

    const goalsWithProgress = goals.map(goal => {
      const latestAnalysis = analyses[0];
      const ind = latestAnalysis?.indicators?.find(
        i => i.name.toLowerCase() === goal.indicatorName.toLowerCase()
      );
      const currentVal = ind ? ind.val : null;
      let progress = null;
      let achieved = false;
      if (currentVal !== null) {
        if (goal.direction === 'below') {
          achieved = currentVal <= goal.targetValue;
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
      return { ...goal.toObject(), currentVal, progress, achieved };
    });

    const familyMembers = await FamilyMember.find({ ownerId: req.params.id }).sort({ createdAt: 1 });

    res.render("goals", {
      user,
      loginUser: req.user,
      analyses,
      goals: goalsWithProgress,
      familyMembers,
      activeMemberId: memberId,
      activePage: 'goals', 
    });
  } catch (error) {
    console.error("Ошибка при загрузке страницы целей:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/all-analyses/:id", isAuth, async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect("/not-found");
 
    const memberId = req.query.member || null;
    const analysisQuery = memberId
      ? { userId: req.params.id, memberId: memberId }
      : { userId: req.params.id, memberId: null };
 
    const analyses = await Analysis.find(analysisQuery).sort({ testDate: -1 }).lean();
 
    analyses.forEach(a => {
      a.indicators.forEach(ind => {
        ind.status = getStatus(ind.val, ind.reference);
      });
    });
 
    const familyMembers = await FamilyMember.find({ ownerId: req.params.id }).sort({ createdAt: 1 });
 
    res.render("allAnalysis", {
      user,
      loginUser: req.user,
      analyses,
      familyMembers,
      activeMemberId: memberId,
      activePage: 'all-analyses',
    });
  } catch (error) {
    console.error("Ошибка при загрузке списка анализов:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router
