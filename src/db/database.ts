import { Pool } from 'pg';
import { config } from '../config/config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({
      connectionString: config.databaseUrl,
    });
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  const pool = getPool();

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) NOT NULL UNIQUE,
      label VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS balances (
      id SERIAL PRIMARY KEY,
      wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
      chain VARCHAR(20) NOT NULL,
      token_address VARCHAR(42),
      token_symbol VARCHAR(20) NOT NULL,
      balance_wei VARCHAR(78) NOT NULL,
      balance_formatted DECIMAL(38, 18) NOT NULL,
      decimals INTEGER NOT NULL,
      is_native BOOLEAN DEFAULT FALSE,
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_balances_wallet_id ON balances(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_balances_chain ON balances(chain);
    CREATE INDEX IF NOT EXISTS idx_balances_recorded_at ON balances(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_balances_token_symbol ON balances(token_symbol);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prices (
      id SERIAL PRIMARY KEY,
      token_symbol VARCHAR(20) NOT NULL,
      price_usd DECIMAL(20, 8) NOT NULL,
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_prices_token_symbol ON prices(token_symbol);
    CREATE INDEX IF NOT EXISTS idx_prices_recorded_at ON prices(recorded_at);
  `);

  console.log('Database initialized successfully');
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
