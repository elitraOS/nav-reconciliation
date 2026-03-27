import { buildApp } from './app.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`NAV API server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
