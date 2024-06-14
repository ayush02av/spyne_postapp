const dotenv = require("dotenv");
const Queue = require("bull");

dotenv.config()

const Job = new Queue(
    'JobComments', {
    redis: {
        url: process.env.REDIS_URL,
    }
});

module.exports = Job;