const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('node:fs');
const redis = require('redis');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const folderName = 'uploads';
try {
    if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
    }
} catch (err) {
    console.error(err);
}

// Redis client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});
redisClient.connect();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Post schema
const postSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String },
    hashtags: [{ type: String }],
    view_count: { type: Number, default: 0 },
    createdOn: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Create a post
app.post('/posts', authenticateToken, upload.single('image'), async (req, res) => {
    const { text, hashtags } = req.body;
    const image = req.file ? req.file.path : null;

    const post = new Post({
        text,
        image,
        hashtags: hashtags ? hashtags.split(',') : [],
        createdOn: new Date()
    });

    try {
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

// Get list of posts based on text search
app.get('/posts/search/:text', async (req, res) => {
    try {
        const posts = await Post.find({ text: new RegExp(req.params.text, 'i') });
        res.send(posts);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Get a post by id
app.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.sendStatus(404);

        const viewCount = await redisClient.get(`post:${req.params.id}:view_count`);
        post.view_count = viewCount ? parseInt(viewCount) : post.view_count;

        res.send(post);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Increment view count of a post
app.post('/posts/:id/view', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.sendStatus(404);

        await redisClient.incr(`post:${req.params.id}:view_count`);
        const viewCount = await redisClient.get(`post:${req.params.id}:view_count`);
        res.send({ view_count: viewCount });
    } catch (err) {
        res.status(400).send(err);
    }
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => console.log(err));
