import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `ratewise-api listening on http://localhost:${config.port} ` +
      `(capacity=${config.rateCapacity}, refill=${config.rateRefill}/s)`,
  );
});
