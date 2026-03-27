import { buildApp } from './app.js';

const app = buildApp();

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err != null) {
    app.log.error(err);
    process.exit(1);
  }
});
