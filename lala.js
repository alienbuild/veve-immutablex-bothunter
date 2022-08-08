const {scheduledHourlyJobs} = require("./services");
require('dotenv').config()

// Services
scheduledHourlyJobs()

console.log('The LALA bot cop is running...')