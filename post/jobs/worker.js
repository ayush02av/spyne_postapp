const jobLikes = require("./job_likes.js");
const jobComments = require("./job_comments.js");

jobLikes.process(async (jobLike) => {
    console.log(jobLike)
})

jobComments.process(async (jobComment) => {
    console.log(jobComment)
})