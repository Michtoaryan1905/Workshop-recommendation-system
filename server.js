const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use('/api', routes);
app.use(notFound); app.use(errorHandler);
if (require.main === module) app.listen(config.port, () => console.log(`API listening on :${config.port}`));
module.exports = app;
