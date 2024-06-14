const mongoose = require('mongoose');

// Like schema
const likeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['post', 'comment'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdOn: { type: Date, default: Date.now }
});

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;