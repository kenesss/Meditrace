const multer = require('multer')

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/img/blogs')
    },
    filename: function(req, file, cb){
        let ext = file.originalname.split(".")
        ext = ext[ext.length - 1]
        const unique = Date.now() + '.' + ext
        cb(null, unique)
    }
})

const upload = multer({storage})
module.exports = {upload}