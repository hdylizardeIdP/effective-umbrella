import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import config from '../src/config/config';

async function runMigration() {
  const client = new Client({
    connectionString: config.database.url,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('\nExecuting database schema...');
    await client.query(schema);
    console.log('✓ Database schema created successfully');

    // Verify tables were created
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await client.query(tablesQuery);
    console.log('\n=== Created Tables ===');
    result.rows.forEach((row) => {
      console.log(`  • ${row.table_name}`);
    });

    // Verify views were created
    const viewsQuery = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const viewsResult = await client.query(viewsQuery);
    console.log('\n=== Created Views ===');
    viewsResult.rows.forEach((row) => {
      console.log(`  • ${row.table_name}`);
    });

    console.log('\n✓ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
if (require.main === module) {
  runMigration();
}

export default runMigration;
