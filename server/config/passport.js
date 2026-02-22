const passport = require('passport')
const User = require('../auth/User')
const bcrypt = require("bcrypt")
const LocalStrategy = require('passport-local')
const GitHubStrategy = require("passport-github2").Strategy;

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
    },
    function (email, password, done) {
      User.findOne({ email })
        .then((user) => {
          bcrypt.compare(password, user.password, function (err, result) {
            if (err) {return done(err);}
            if (result) {return done(null, user)}
          });
        }).catch(e =>{
            return done(e)
        })
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: "Ov23lipYfq1MCgduNdHP",
      clientSecret: "b508cb4ea3c70977ecbe51e90601da9ca3ec5cf4",
      callbackURL: "http://localhost:8000/api/auth/github",
      scope: ["user", "email"],
    },
    async function (accessToken, refreshToken, profile, cb) {
      const user = await User.find({ githubId: profile.id });
      const newUser = await new User({
        githubId: profile.id,
        full_name: profile.displayName,
        email: profile.emails[0].value,
      }).save();
      return cb(null, newUser);
    }
  )
);



passport.serializeUser(function(user, done) {
    done(null, user._id)
})

passport.deserializeUser(function(id, done) {
    User.findById(id).then((user, err) => {
        done(err, user)
    })
})
