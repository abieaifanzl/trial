const serverless = require('serverless-http');
// Import your main Express app instance from your server code
// (Adjust the path below to point to wherever your Express app is initialized)
const app = require('../server/index.js'); 

module.exports = serverless(app);