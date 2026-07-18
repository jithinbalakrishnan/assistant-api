const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
