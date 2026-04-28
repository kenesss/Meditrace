const User = require('./User')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { validationResult } = require('express-validator')

const signUp = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.redirect('/regester?error=1')
  }

  // Проверка, существует ли уже пользователь с таким email
  const findUser = await User.findOne({ email: req.body.email });
  if (findUser) {
    return res.redirect('/regester?error=3');
  }

  // Хеширование пароля и сохранение нового пользователя
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return console.log(err);

    bcrypt.hash(req.body.password, salt, async (err, hash) => {
      if (err) return console.log(err);

      try {
        const newUser = new User({
          email: req.body.email,
          full_name: req.body.full_name,
          password: hash,
        });

        await newUser.save();

        req.login(newUser, (err) => {
          if (err) {
            console.log(err);
            return res.redirect('/regester?error=4');
          }
          res.redirect(`/profile/${newUser._id}`);
        });
      } catch (err) {
        console.log(err);
        res.redirect('/regester?error=4');
      }
    });
  });
}

const signIn = (req, res) => {
  res.redirect(`/profile/${req.user._id}`);
};

const signOut = (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.log(err);
      return res.redirect("/");
    }
    res.redirect("/");
  });
};

const requestPasswordReset = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.redirect('/forgot?error=1')
  }

  try {
    const email = String(req.body.email || '').trim()
    const user = await User.findOne({ email })
    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      user.resetToken = token
      user.resetTokenExpiry = new Date(Date.now() + 3600000)
      await user.save()
      console.log('[Password reset token]', token)
    }
    return res.redirect('/forgot?sent=1')
  } catch (err) {
    console.log(err)
    return res.redirect('/forgot?error=4')
  }
}

const resetPassword = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.redirect('/forgot?error=1')
  }

  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })
    if (!user) {
      return res.redirect('/forgot?error=3');
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) return console.log(err);

      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) return console.log(err);

        try {
          await User.findByIdAndUpdate(user._id, {
            $set: { password: hash },
            $unset: { resetToken: 1, resetTokenExpiry: 1 },
          });
          res.redirect('/login?success=1');
        } catch (err) {
          console.log(err);
          res.redirect('/forgot?error=4');
        }
      });
    });
  } catch (err) {
    console.log(err);
    res.redirect('/forgot?error=4');
  }
};

module.exports = {
  signUp,
  signIn,
  signOut,
  requestPasswordReset,
  resetPassword,
};