const express = require("express");
const passport = require("passport");
const router = express.Router();
const { signUp, signIn, singOut } = require("./controller");

router.post("/api/signup", signUp);
router.post("/api/signin", passport.authenticate("local", { failureRefirect: "/login?error=1" }),signIn);
router.get("/api/signout", singOut);
router.get("/api/auth/github", passport.authenticate('github'), (req, res) => {
    res.redirect('/profile/' + req.user._id)
});

module.exports = router;