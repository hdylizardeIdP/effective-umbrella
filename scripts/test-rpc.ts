import { blockchainService } from '../src/services/blockchain.service';

async function testRPCConnections() {
  console.log('\n=== Testing RPC Connections ===\n');

  try {
    const results = await blockchainService.testAllConnections();

    console.log('\n=== Connection Test Results ===\n');
    let allSuccess = true;

    for (const [chain, success] of Object.entries(results)) {
      const status = success ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} - ${chain}`);
      if (!success) allSuccess = false;
    }

    console.log('\n================================\n');

    if (allSuccess) {
      console.log('✓ All RPC connections successful!');
      process.exit(0);
    } else {
      console.log('✗ Some RPC connections failed. Please check your .env configuration.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during RPC connection test:', error);
    process.exit(1);
  }
}

testRPCConnections();
