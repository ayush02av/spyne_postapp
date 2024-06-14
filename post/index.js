const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('node:fs');

const discussionRouter = require('./routes/discussions.js');
const postRouter = require('./routes/posts.js');

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

app.use('/', discussionRouter);
app.use('/', postRouter)

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
