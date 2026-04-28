const express = require("express");
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const { signUp, signIn, signOut, requestPasswordReset, resetPassword } = require("./controller");
const User = require('./User');
const bcrypt = require('bcrypt');

router.post(
  "/api/signup",
  [
    body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
    body("full_name").trim().isLength({ min: 2 }).withMessage("Имя минимум 2 символа"),
    body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
    body("re_password")
      .custom((val, { req }) => val === req.body.password)
      .withMessage("Пароли не совпадают"),
  ],
  signUp
);
router.post("/api/signin", passport.authenticate("local", { failureRedirect: "/login?error=1" }),signIn);
router.get("/api/signout", signOut);
router.get("/api/auth/github", passport.authenticate('github'), (req, res) => {
    res.redirect('/profile/' + req.user._id)
});
router.post(
  "/api/forgot",
  [
    body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
  ],
  requestPasswordReset
);
router.post(
  "/api/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Токен обязателен"),
    body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
    body("re_password")
      .custom((val, { req }) => val === req.body.password)
      .withMessage("Пароли не совпадают"),
  ],
  resetPassword
);

// Изменение имени
router.post('/settings/update-name', async (req, res) => {
    if (!req.user) return res.redirect('/login');

    const { name } = req.body;
    if (!name || name.trim().length < 2) {
        return res.redirect(`/setting/${req.user._id}?error=name`);
    }

    await User.findByIdAndUpdate(req.user._id, { full_name: name.trim() });
    res.redirect(`/setting/${req.user._id}?success=name`);
});

// Изменение пароля
router.post('/settings/update-password', async (req, res) => {
    if (!req.user) return res.redirect('/login');

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.redirect(`/setting/${req.user._id}?error=confirm`);
    }
    if (newPassword.length < 6) {
        return res.redirect(`/setting/${req.user._id}?error=short`);
    }

    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
        return res.redirect(`/setting/${req.user._id}?error=wrong`);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await User.findByIdAndUpdate(req.user._id, { password: hash });
    res.redirect(`/setting/${req.user._id}?success=password`);
});

module.exports = router;