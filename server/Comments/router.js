const express = require("express");
const router = express.Router();
const { saveComment } = require("./controller");

router.post("/api/comment", saveComment);

module.exports = router;
