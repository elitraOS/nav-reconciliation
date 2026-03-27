import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

// Load .env.test from the repo root
dotenv.config({ path: resolve(process.cwd(), '.env.test') });

const ANVIL_PORT = 8545;
const ANVIL_HOST = '127.0.0.1';
const ANVIL_URL = `http://${ANVIL_HOST}:${ANVIL_PORT}`;

// Pinned block: Avalanche C-Chain block 55_000_000 (post-Etna, ~Jan 2025)
const FORK_BLOCK = 55_000_000;
const STARTUP_TIMEOUT_MS = 30_000;

let anvilProcess: ChildProcess | null = null;

async function waitForAnvil(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(ANVIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      if (resp.ok) return;
    } catch {
      // Not ready yet — continue polling
    }
    await new Promise<void>((r) => setTimeout(r, 500));
  }
  throw new Error(`Anvil did not become ready within ${timeoutMs}ms`);
}

export async function setup(): Promise<void> {
  const rpcUrl = process.env['AVALANCHE_RPC_URL'];
  if (!rpcUrl) {
    // Signal tests to skip gracefully
    process.env['INTEGRATION_TESTS_SKIP'] = 'true';
    return;
  }

  anvilProcess = spawn(
    'anvil',
    [
      '--fork-url', rpcUrl,
      '--fork-block-number', String(FORK_BLOCK),
      '--chain-id', '43114',
      '--port', String(ANVIL_PORT),
    ],
    {
      detached: true,
      stdio: 'ignore',
    },
  );

  anvilProcess.unref();
  await waitForAnvil(STARTUP_TIMEOUT_MS);
}

export async function teardown(): Promise<void> {
  if (anvilProcess !== null) {
    const pid = anvilProcess.pid;
    if (pid !== undefined) {
      try {
        // Kill the entire process group to avoid dangling children
        process.kill(-pid, 'SIGTERM');
      } catch {
        // Process may have already exited
      }
    }
    anvilProcess = null;
  }
}
