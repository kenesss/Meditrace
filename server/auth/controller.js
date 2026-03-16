const User = require('./User')
const bcrypt = require('bcrypt')

const signUp = async (req, res) => {
  // Проверка на пустые поля
  if (
    req.body.email.length <= 0 ||
    req.body.full_name.length <= 0 ||
    req.body.password.length <= 0 ||
    req.body.re_password.length <= 0
  ) {
    return res.redirect('/regester?error=1');  // Ошибка при пустых полях
  }

  // Проверка совпадения паролей
  if (req.body.password !== req.body.re_password) {
    return res.redirect('/regester?error=2');  // Ошибка при несовпадении паролей
  }

  // Проверка, существует ли уже пользователь с таким email
  const findUser = await User.findOne({ email: req.body.email });
  if (findUser) {
    return res.redirect('/regester?error=3');  // Ошибка, если пользователь уже существует
  }

  // Хеширование пароля и сохранение нового пользователя
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return console.log(err);  // Обработка ошибки при создании соли

    bcrypt.hash(req.body.password, salt, async (err, hash) => {
      if (err) return console.log(err);  // Обработка ошибки при хешировании пароля

      try {
        // Создание нового пользователя и сохранение
        const newUser = new User({
          email: req.body.email,
          full_name: req.body.full_name,
          password: hash,
        });

        await newUser.save();
        
        // Автоматический вход после регистрации
        req.login(newUser, (err) => {
          if (err) {
            console.log(err);
            return res.redirect('/regester?error=4');
          }
          res.redirect(`/profile/${newUser._id}`);
        });
      } catch (err) {
        console.log(err);  // Обработка ошибки при сохранении пользователя
        res.redirect('/regester?error=4');  // Ошибка при сохранении
      }
    });
  });
}

const signIn = (req, res) => {
  res.redirect(`/profile/${req.user._id}`);
};

const singOut = (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
  });
  res.redirect("/");
};

const resetPassword = async (req, res) => {
  const { email, password, re_password } = req.body;

  if (!email || !password || !re_password) {
    return res.redirect('/forgot?error=1');
  }

  if (password !== re_password) {
    return res.redirect('/forgot?error=2');
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect('/forgot?error=3');
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) return console.log(err);

      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) return console.log(err);

        try {
          user.password = hash;
          await user.save();
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
  singOut,
  resetPassword,
};
