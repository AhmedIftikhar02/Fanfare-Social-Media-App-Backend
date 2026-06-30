const app = require('./src/app');
const config = require('./src/config');

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
});
