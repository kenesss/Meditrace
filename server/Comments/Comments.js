const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new mongoose.Schema({
  text: String,
  blogId: { type: Schema.Types.ObjectId, ref: "blog" },
  authorId: { type: Schema.Types.ObjectId, ref: "user" },
  date: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("comment", CommentSchema);
