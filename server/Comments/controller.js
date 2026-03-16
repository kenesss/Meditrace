const Comments = require('./Comments');

const saveComment = async (req, res) => {
  if (req.body.comment_author && req.body.comment_blog) {
    if (req.body.comment_text.length > 0) {
      await new Comments({
        text: req.body.comment_text,
        authorId: req.body.comment_author,
        blogId: req.body.comment_blog,
        date: new Date(),
      }).save();
      res.redirect(`/details/${req.body.comment_blog}`);
    } else {
      res.redirect('/new?error=1');
    }
  }
};
module.exports = {
  saveComment,
};
