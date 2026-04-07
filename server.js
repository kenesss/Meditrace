require('dotenv').config();

const express = require('express');
const session = require("express-session");
const mongooseStore = require("connect-mongo");
const passport = require('passport');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

console.log("Ключ OpenAI загружен:", process.env.OPENAI_API_KEY ? "Да" : "Нет");

require('./server/config/db');
require("./server/config/passport.js");

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  name: "decodeblog.session",
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  store: mongooseStore.create({ mongoUrl: process.env.MONGO_URL }),
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(require("./server/Parser/router"));
app.use(require('./server/family/router'));
app.use(require('./server/goals/router'));
app.use(require("./server/pages/router"));
app.use(require("./server/auth/router"));
app.use(require("./server/ai/router"));

app.set("view engine", "ejs");
app.set('views', [path.join(__dirname, 'views'), __dirname]);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
