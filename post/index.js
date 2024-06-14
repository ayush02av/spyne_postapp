const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('node:fs');

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

// Discussion schema
const discussionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String },
    hashtags: [{ type: String }],
    createdOn: { type: Date, default: Date.now }
});

const Discussion = mongoose.model('Discussion', discussionSchema);

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

// Start server
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(
        () => {
            console.log('MongoDB connected')
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }
    )
    .catch(
        err => console.log(err)
    );
