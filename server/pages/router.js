const express = require('express')
const router = express.Router();
const Genres = require('../Genres/Genres')
const User = require('../auth/User')
const Blog = require('../Blogs/blog')
const Comment = require("../Comments/Comments");
const Analysis = require('../Parser/Analysis');
const FamilyMember = require('../family/FamilyMember');
const { isAuth } = require('../auth/middlewares');


router.get('/', async (req, res) => {
  const options = {};
  const genres = await Genres.findOne({ key: req.query.genre });
  if (genres) {
    options.genre = genres._id;
    res.locals.genre = req.query.genre;
  }
  let page = 0;
  const limit = 2;
  if (req.query.page && req.query.page > 0) {
    page = req.query.page;
  }
  if (req.query.search && req.query.search.length > 0) {
    options.$or = [
      {
        name: new RegExp(req.query.search, 'i')
      }
    ]
  }
  res.locals.search = req.query.search
  const totalBlog = await Blog.countDocuments(options);
  const allGenres = await Genres.find()
  const blog = await Blog.find(options).limit(limit).skip(page * limit).populate("genre").populate("author");
  res.render("index", { genres: allGenres, user: req.user ? req.user : {}, blog: blog, pages: Math.ceil(totalBlog / limit) });
})

router.get("/login", (req, res) => {
  res.render("login", { user: req.user ? req.user : {} });
});

router.get("/regester", (req, res) => {
  res.render("regester", { user: req.user ? req.user : {} });
});

// router.get("/new", async (req, res) => {
//   const allGenres = await Genres.find()
//   res.render("newBlog", { genres: allGenres, user: req.user ? req.user : {} });
// });

// router.get("/edit/:id", async (req, res) => {
//   const allGenres = await Genres.find()
//   const blog = await Blog.findById(req.params.id)
//   res.render("editBlog", { genres: allGenres, user: req.user ? req.user : {}, blog });
// });



router.get("/profile/:id", isAuth, async (req, res) => {
  try {
    const allGenres = await Genres.find();
    const blog = await Blog.find().populate("genre").populate('author');
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

      function getStatus(val, reference) {
        const noData = { label: 'Нет данных', color: '#6b7280', bg: '#f9fafb' };
        if (reference == null || String(reference).trim() === '') {
          return noData;
        }
        const parts = String(reference).trim().split('-');
        if (parts.length !== 2) {
          return noData;
        }
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (Number.isNaN(min) || Number.isNaN(max)) {
          return noData;
        }
        const numVal = typeof val === 'number' ? val : parseFloat(val);
        if (Number.isNaN(numVal)) {
          return noData;
        }
        if (numVal < min) {
          return { label: 'Ниже нормы', color: '#2563eb', bg: '#eff6ff' };
        }
        if (numVal > max) {
          return { label: 'Выше нормы', color: '#dc2626', bg: '#fef2f2' };
        }
        return { label: 'В норме', color: '#16a34a', bg: '#f0fdf4' };
      }

      analyses.forEach(a => {
        a.indicators.forEach(ind => {
          ind.status = getStatus(ind.val, ind.reference);
        });
      });

      // Передаем переменную analyses в шаблон
      res.render("profile", {
        user: user,
        genres: allGenres,
        loginUser: req.user,
        blog: blog,
        analyses: analyses,
        familyMembers: familyMembers,
        activeMember: activeMember,
        activeMemberId: memberId,
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
    const allGenres = await Genres.find();
    const familyMembers = await FamilyMember.find({ ownerId: req.user._id });

    res.render("addMembers", {
      user: req.user ? req.user : {},
      genres: allGenres,
      familyMembers: familyMembers,
      activeMemberId: req.query.member || null,
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
    });
  } else {
    res.redirect("/not-found");
  }
});

// router.get("/details/:id", isAuth, async (req, res) => {
//   const comments = await Comment.find({ blogId: req.params.id }).populate("authorId");
//   const blog = await Blog.findById(req.params.id).populate("genre").populate("author");
//   const allGenres = await Genres.find();
//   res.render("details", {
//     user: req.user ? req.user : {},
//     blog: blog,
//     genres: allGenres,
//     comments,
//   });
// });

module.exports = router