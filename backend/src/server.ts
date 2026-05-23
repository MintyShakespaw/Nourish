import app from './app.js';
import { env } from './config/env.js';
app.listen(env.PORT, () => {
  console.log(`Nourish API running on http://localhost:${env.PORT}`);
});
