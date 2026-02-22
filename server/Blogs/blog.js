const mongoose = require('mongoose')
const Schema = mongoose.Schema

const BlogsSchema = new mongoose.Schema({
    name: String,
    genre: { type: Schema.Types.ObjectId, ref: "genre" },
    image: String,
    description: String,
    author: {type: Schema.Types.ObjectId , ref: 'user'},
})

module.exports = mongoose.model("blog", BlogsSchema);