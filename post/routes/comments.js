const express = require('express');

const Post = require('../models/post.js');
const Comment = require('../models/comment.js');

const JobComments = require('../jobs/job_comments.js');

const authenticateToken = require('../utility/middleware.js');

const app = express.Router();

// Create a comment
app.post('/interact/comments/:postId', authenticateToken, async (req, res) => {
    console.log("commentsss")
    try {
        const { text } = req.body;
        const postId = req.params.postId;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send({ error: 'Post not found' });
        }

        const comment = new Comment({
            text,
            user: userId,
            post: postId
        });
        await comment.save();

        res.status(201).send(comment);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Create a reply
app.post('/interact/replies/:commentId', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        const commentId = req.params.commentId;
        const userId = req.user.userId;

        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        const reply = new Comment({
            text,
            user: userId,
            comment: commentId
        });

        await reply.save();

        res.status(201).send(reply);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Update a comment
app.put('/interact/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        const commentId = req.params.commentId;
        const userId = req.user.userId;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        // Check if user is authorized to update comment
        if (!comment.user.equals(userId)) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        comment.text = text;
        await comment.save();

        res.send(comment);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Delete a comment
app.delete('/interact/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const userId = req.user.userId;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        // Check if user is authorized to delete comment
        if (!comment.user.equals(userId)) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        // Remove comment from its parent (post or another comment)
        await Comment.deleteOne({ _id: commentId });

        res.send({ message: 'Comment deleted successfully' });
    } catch (err) {
        res.status(400).send(err);
    }
});

module.exports = app;