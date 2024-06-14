const mongoose = require('mongoose');

// Post schema
const postSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String },
    hashtags: [{ type: String }],
    view_count: { type: Number, default: 0 },
    createdOn: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;