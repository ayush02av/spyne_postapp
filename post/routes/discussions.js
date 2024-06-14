const express = require('express');
const mongoose = require('mongoose');

const authenticateToken = require('../utility/middleware.js');
const upload = require('../utility/storage.js');

const app = express.Router();

// Discussion schema
const discussionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String },
    hashtags: [{ type: String }],
    createdOn: { type: Date, default: Date.now }
});

const Discussion = mongoose.model('Discussion', discussionSchema);

// Create a discussion
app.post('/discussions', authenticateToken, upload.single('image'), async (req, res) => {
    const { text, hashtags } = req.body;
    const image = req.file ? req.file.path : null;

    const discussion = new Discussion({
        text,
        image,
        hashtags: hashtags ? hashtags.split(',') : [],
        createdOn: new Date()
    });

    try {
        await discussion.save();
        res.status(201).send(discussion);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Update a discussion
app.put('/discussions/:id', authenticateToken, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.sendStatus(404);

        if (req.body.text) discussion.text = req.body.text;
        if (req.body.hashtags) discussion.hashtags = req.body.hashtags.split(',');

        await discussion.save();
        res.send(discussion);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Delete a discussion
app.delete('/discussions/:id', authenticateToken, async (req, res) => {
    try {
        const discussion = await Discussion.findByIdAndDelete(req.params.id);
        if (!discussion) return res.sendStatus(404);

        res.send(discussion);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Get list of discussions based on tags
app.get('/discussions/tags/:tag', async (req, res) => {
    try {
        const discussions = await Discussion.find({ hashtags: req.params.tag });
        res.send(discussions);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Get list of discussions based on text search
app.get('/discussions/search/:text', async (req, res) => {
    try {
        const discussions = await Discussion.find({ text: new RegExp(req.params.text, 'i') });
        res.send(discussions);
    } catch (err) {
        res.status(400).send(err);
    }
});

module.exports = app;