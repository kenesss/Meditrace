require('dotenv').config();
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { reply: 'Слишком много запросов. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Слишком много загрузок. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports.aiLimiter = aiLimiter;
module.exports.uploadLimiter = uploadLimiter;

const express = require('express')
const session = require("express-session");
const mongooseStore = require("connect-mongo");
const passport = require('passport')
const path = require('path');
const fs = require('fs');

console.log("Ключ OpenAI загружен:", process.env.OPENAI_API_KEY ? "Да" : "Нет");

const app = express()

require('./server/config/db')
require("./server/config/passport.js");

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Создана папка для загрузок:', uploadDir);
}

app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname));
app.use(express.urlencoded());
app.use(express.json());

app.use(
  session({
    name: "decodeblog.session",
    secret: process.env.SESSION_SECRET,
    maxAge: 1000 * 60 * 60 * 7,
    resave: false,
    store: mongooseStore.create({
      mongoUrl: process.env.MONGO_URL
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./server/Parser/router"));
app.use(require("./server/pages/router"));
app.use(require("./server/auth/router"));
app.use(require("./server/ai/router"));

app.set("view engine", "ejs")
app.set("public engine", "ejs")
app.set('views', [path.join(__dirname, 'views'), __dirname]);

const PORT = 8000
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});