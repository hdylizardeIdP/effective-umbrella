-- Wallet Balance Tracker Database Schema
-- PostgreSQL

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wallets table: Store tracked wallet addresses
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(42) NOT NULL UNIQUE,
    label VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on address for fast lookups
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);

-- Balances table: Store balance history for wallets
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    chain VARCHAR(50) NOT NULL,  -- ethereum, polygon, arbitrum
    token_type VARCHAR(20) NOT NULL,  -- 'native' or 'erc20'
    token_address VARCHAR(42),  -- NULL for native tokens
    token_symbol VARCHAR(20) NOT NULL,
    token_name VARCHAR(255),
    decimals INTEGER NOT NULL,
    balance NUMERIC(78, 0) NOT NULL,  -- Store as wei/smallest unit (supports up to 78 digits)
    balance_formatted VARCHAR(50) NOT NULL,  -- Human-readable balance
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    block_number BIGINT,

    CONSTRAINT check_token_type CHECK (token_type IN ('native', 'erc20')),
    CONSTRAINT check_native_no_address CHECK (
        (token_type = 'native' AND token_address IS NULL) OR
        (token_type = 'erc20' AND token_address IS NOT NULL)
    )
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_balances_wallet_id ON balances(wallet_id);
CREATE INDEX IF NOT EXISTS idx_balances_chain ON balances(chain);
CREATE INDEX IF NOT EXISTS idx_balances_timestamp ON balances(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_balances_wallet_chain_token ON balances(wallet_id, chain, token_symbol, timestamp DESC);

-- Prices table: Store token price history
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_symbol VARCHAR(20) NOT NULL,
    coingecko_id VARCHAR(100) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_usd NUMERIC(20, 10) NOT NULL,
    market_cap_usd NUMERIC(30, 2),
    volume_24h_usd NUMERIC(30, 2),
    price_change_24h NUMERIC(10, 4),  -- Percentage
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_price_positive CHECK (price_usd >= 0)
);

-- Indexes for price queries
CREATE INDEX IF NOT EXISTS idx_prices_symbol ON prices(token_symbol);
CREATE INDEX IF NOT EXISTS idx_prices_coingecko_id ON prices(coingecko_id);
CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prices_symbol_timestamp ON prices(token_symbol, timestamp DESC);

-- Portfolio snapshots table: Store aggregated portfolio values
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    total_value_usd NUMERIC(20, 2) NOT NULL,
    chain_breakdown JSONB,  -- JSON object with per-chain values
    token_breakdown JSONB,  -- JSON object with per-token values
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for portfolio snapshots
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_wallet_id ON portfolio_snapshots(wallet_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_timestamp ON portfolio_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_wallet_timestamp ON portfolio_snapshots(wallet_id, timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for wallets table
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for latest balances per wallet/chain/token
CREATE OR REPLACE VIEW latest_balances AS
SELECT DISTINCT ON (wallet_id, chain, token_symbol)
    b.*
FROM balances b
ORDER BY wallet_id, chain, token_symbol, timestamp DESC;

-- View for latest prices
CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (token_symbol, chain)
    p.*
FROM prices p
ORDER BY token_symbol, chain, timestamp DESC;

-- Comments for documentation
COMMENT ON TABLE wallets IS 'Stores wallet addresses being tracked';
COMMENT ON TABLE balances IS 'Historical balance data for each wallet, chain, and token';
COMMENT ON TABLE prices IS 'Historical price data from CoinGecko or other sources';
COMMENT ON TABLE portfolio_snapshots IS 'Aggregated portfolio values over time';
COMMENT ON VIEW latest_balances IS 'Most recent balance for each wallet/chain/token combination';
COMMENT ON VIEW latest_prices IS 'Most recent price for each token';
