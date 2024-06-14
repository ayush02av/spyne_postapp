const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const redis = require('redis');

const authenticateToken = require('../utility/middleware.js');
const upload = require('../utility/storage.js');

dotenv.config();

const app = express.Router();

// Redis client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});
redisClient.connect();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Post schema
const postSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String },
    hashtags: [{ type: String }],
    view_count: { type: Number, default: 0 },
    createdOn: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Create a post
app.post('/posts', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { text, hashtags } = req.body;
        const image = req.file ? req.file.path : null;

        const post = new Post({
            text,
            image,
            hashtags: hashtags ? hashtags.split(',') : [],
            createdOn: new Date()
        });

        await post.save();
        res.status(201).send(post);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Update a post
app.put('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.sendStatus(404);

        if (req.body.text) post.text = req.body.text;
        if (req.body.hashtags) post.hashtags = req.body.hashtags.split(',');

        await post.save();
        res.send(post);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Delete a post
app.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);
        if (!post) return res.sendStatus(404);

        res.send(post);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Get list of posts based on tags
app.get('/posts/tags/:tag', async (req, res) => {
    try {
        const posts = await Post.find({ hashtags: req.params.tag });
        res.send(posts);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Get all posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find();

        // Fetch view counts from Redis
        const redisViewCounts = await Promise.all(posts.map(post => redisClient.get(`post:${post._id}:view_count`)));

        // Update view counts in posts
        posts.forEach((post, index) => {
            if (redisViewCounts[index] !== null) {
                post.view_count = parseInt(redisViewCounts[index], 10);
            }
        });

        res.send(posts);
    } catch (err) {
        res.status(400).send(err);
    }
});

module.exports = app;