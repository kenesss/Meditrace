const express = require("express");
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const { signUp, signIn, singOut, requestPasswordReset, resetPassword } = require("./controller");

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
router.get("/api/signout", singOut);
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

module.exports = router;