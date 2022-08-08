const schedule = require('node-schedule');

const { getTransactions } = require("./getTransactions");

// Functions to run every hour
exports.scheduledHourlyJobs = () => {
    schedule.scheduleJob('59 * * * *', () => {
        // Detect suspects
        getTransactions()
    })
}

