const mongoose = require('mongoose');

// Discussion schema
const discussionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String },
    hashtags: [{ type: String }],
    createdOn: { type: Date, default: Date.now }
});

const Discussion = mongoose.model('Discussion', discussionSchema);

module.exports = Discussion;