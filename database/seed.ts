import { Client } from 'pg';
import config from '../src/config/config';

/**
 * Seed database with sample data for testing
 */
async function seedDatabase() {
  const client = new Client({
    connectionString: config.database.url,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');

    console.log('\n=== Seeding Sample Data ===\n');

    // Sample wallet address (Vitalik's address)
    const sampleAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    // Insert sample wallet
    console.log('Inserting sample wallet...');
    const walletResult = await client.query(
      `INSERT INTO wallets (address, label)
       VALUES ($1, $2)
       ON CONFLICT (address) DO UPDATE SET label = $2
       RETURNING id`,
      [sampleAddress, 'Sample Wallet (Vitalik)']
    );
    const walletId = walletResult.rows[0].id;
    console.log(`✓ Wallet inserted with ID: ${walletId}`);

    // Insert sample native balances
    console.log('\nInserting sample balances...');
    await client.query(
      `INSERT INTO balances (wallet_id, chain, token_type, token_address, token_symbol, token_name, decimals, balance, balance_formatted, block_number)
       VALUES
       ($1, 'ethereum', 'native', NULL, 'ETH', 'Ethereum', 18, '1000000000000000000', '1.0', 18000000),
       ($1, 'polygon', 'native', NULL, 'MATIC', 'Polygon', 18, '5000000000000000000', '5.0', 50000000),
       ($1, 'arbitrum', 'native', NULL, 'ARB', 'Arbitrum', 18, '2000000000000000000', '2.0', 140000000)`,
      [walletId]
    );
    console.log('✓ Native balances inserted');

    // Insert sample token balances
    await client.query(
      `INSERT INTO balances (wallet_id, chain, token_type, token_address, token_symbol, token_name, decimals, balance, balance_formatted)
       VALUES
       ($1, 'ethereum', 'erc20', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 'USD Coin', 6, '1000000000', '1000.0'),
       ($1, 'ethereum', 'erc20', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 'Tether USD', 6, '500000000', '500.0'),
       ($1, 'polygon', 'erc20', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'USDC', 'USD Coin', 6, '2000000000', '2000.0')`,
      [walletId]
    );
    console.log('✓ Token balances inserted');

    // Insert sample prices
    console.log('\nInserting sample prices...');
    await client.query(
      `INSERT INTO prices (token_symbol, coingecko_id, chain, price_usd, market_cap_usd, volume_24h_usd, price_change_24h)
       VALUES
       ('ETH', 'ethereum', 'ethereum', 2500.00, 300000000000, 15000000000, 2.5),
       ('MATIC', 'matic-network', 'polygon', 0.85, 8000000000, 400000000, -1.2),
       ('ARB', 'arbitrum', 'arbitrum', 1.20, 1500000000, 150000000, 3.8),
       ('USDC', 'usd-coin', 'ethereum', 1.00, 25000000000, 3000000000, 0.01),
       ('USDT', 'tether', 'ethereum', 1.00, 85000000000, 25000000000, -0.01)`
    );
    console.log('✓ Sample prices inserted');

    // Insert sample portfolio snapshot
    console.log('\nInserting sample portfolio snapshot...');
    await client.query(
      `INSERT INTO portfolio_snapshots (wallet_id, total_value_usd, chain_breakdown, token_breakdown)
       VALUES ($1, $2, $3, $4)`,
      [
        walletId,
        8003.25,
        JSON.stringify({
          ethereum: 4000.0,
          polygon: 2004.25,
          arbitrum: 2400.0,
        }),
        JSON.stringify({
          ETH: 2500.0,
          MATIC: 4.25,
          ARB: 2.4,
          USDC: 3000.0,
          USDT: 500.0,
        }),
      ]
    );
    console.log('✓ Portfolio snapshot inserted');

    console.log('\n=== Seed Data Summary ===');
    console.log('  • 1 wallet');
    console.log('  • 6 balance records');
    console.log('  • 5 price records');
    console.log('  • 1 portfolio snapshot');

    console.log('\n✓ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
