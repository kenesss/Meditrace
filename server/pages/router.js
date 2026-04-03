const express = require('express')
const router = express.Router();
const Genres = require('../Genres/Genres')
const User = require('../auth/User')
const Blog = require('../Blogs/blog')
const Comment = require("../Comments/Comments");
const Analysis = require('../Parser/Analysis');
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
      // КЛЮЧЕВОЙ МОМЕНТ: Ищем анализы пользователя в БД
      const analyses = await Analysis.find({ userId: req.params.id }).sort({ testDate: -1 });

      // Передаем переменную analyses в шаблон
      res.render("profile", {
        user: user,
        genres: allGenres,
        loginUser: req.user,
        blog: blog,
        analyses: analyses // <-- ОШИБКА БЫЛА ТУТ: эта строка обязательна!
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
  res.render("forgot", { user: req.user ? req.user : {} });
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

    res.render("addMembers", {
      user: req.user ? req.user : {},
      genres: allGenres 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.get("/setting/:id", isAuth, async function (req, res) {
  const user = await User.findById(req.params.id);
  if (user) {
    res.render("setting", {
      user: user,
      loginUser: req.user,
    });
  } else {
    res.redirect("/not-found");
  }
});
router.get("/ai/:id", isAuth, async function (req, res) {
  const user = await User.findById(req.params.id);
  if (user) {
    res.render("ai", {
      user: user,
      loginUser: req.user,
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