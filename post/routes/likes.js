const express = require('express');

const Like = require('../models/like.js');

const JobLikes = require('../jobs/job_likes.js');
const authenticateToken = require('../utility/middleware.js');

const app = express.Router();

// Like a post or comment
app.post('/interact/likes/:type/:targetId', authenticateToken, async (req, res) => {
    try {
        const { type, targetId } = req.params;
        const userId = req.user.userId;

        const like = new Like({
            user: userId,
            type,
            target: targetId
        });

        await like.save();

        res.status(201).send(like);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Delete a like
app.delete('/interact/likes/:likeId', authenticateToken, async (req, res) => {
    try {
        const { likeId } = req.params;
        const userId = req.user.userId;

        const like = await Like.findById(likeId);
        if (!like) {
            return res.status(404).send({ error: 'Like not found' });
        }

        // Check if user is authorized to delete like
        if (!like.user.equals(userId)) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        await Like.deleteOne({ _id: likeId });

        res.send({ message: 'Like deleted successfully' });
    } catch (err) {
        res.status(400).send(err);
    }
});

module.exports = app;