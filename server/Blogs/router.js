const express = require('express')
const router = express.Router()
const {upload} = require('./multer')
const { createBlog, editBlog, deleteBlog} = require("./controller");
const {isAuth} = require('../auth/middlewares')

router.post('/api/blog/new', isAuth, upload.single('img'), createBlog)
router.post("/api/blog/edit", isAuth, upload.single("img"), editBlog);
router.delete("/api/blog/:id", isAuth, deleteBlog);

module.exports = router