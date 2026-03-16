const express = require('express')
const session = require("express-session");
const mongooseStore = require("connect-mongo");
const passport = require('passport')
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const PDFParser = require("pdf2json");

const app = express()

require('./server/config/db')
require("./server/config/passport.js");

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Создана папка для загрузок:', uploadDir);
}

const upload = multer({ 
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Только PDF файлы разрешены'), false);
    }
  }
});

app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname));
app.use(express.urlencoded());
app.use(express.json()); 

app.use(
  session({
    name: "decodeblog.session",
    secret: "keyboard cat",
    maxAge: 1000 * 60 * 60 * 7,
    resave: false,
    store: mongooseStore.create({
      mongoUrl: "mongodb://localhost:27017",
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./server/Genres/router"));
app.use(require("./server/auth/router"));
app.use(require("./server/pages/router"))
app.use(require("./server/Blogs/router"));
app.use(require("./server/Comments/router"));
app.use(require("./server/Parser/router"));

app.set("view engine", "ejs")
app.set("public engine", "ejs") 
app.set('views', [path.join(__dirname, 'views'), __dirname]); 

const PORT = 8000 
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});