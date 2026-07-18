const express = require('express');
const chatRoutes = require('./chatRoutes');

const router = express.Router();

router.use(chatRoutes);

module.exports = router;
