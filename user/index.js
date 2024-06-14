const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    mobile: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const User = mongoose.model('User', userSchema);

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

// Create User
app.post('/signup', async (req, res) => {
    const { name, mobile, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, mobile, email, password: hashedPassword });

    try {
        await user.save();
        res.status(201).send('User created');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Login User
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('User not found');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid credentials');

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ user, token });
});

// Update User
app.put('/users/:id', authenticateToken, async (req, res) => {
    const { name, mobile, email } = req.body;
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { name, mobile, email }, { new: true }).select('-password');
        if (!user) return res.status(404).send('User not found');
        res.send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Delete User
app.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).send('User not found');
        res.send('User deleted');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Show list of users
app.get('/users', authenticateToken, async (req, res) => {
    const users = await User.find();
    res.send(users);
});

// Search user based on name
app.get('/users/search/:name', authenticateToken, async (req, res) => {
    const users = await User.find({ name: new RegExp(req.params.name, 'i') });
    res.send(users);
});

// Follow another user
app.post('/users/:id/follow', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const userToFollow = await User.findById(req.params.id);

        if (!user || !userToFollow) return res.status(404).send('User not found');

        if (user.followers.includes(userToFollow._id)) {
            return res.status(400).send('Already following this user');
        }

        user.followers.push(userToFollow._id);
        await user.save();

        res.send('User followed');
    } catch (err) {
        res.status(400).send(err.message);
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
