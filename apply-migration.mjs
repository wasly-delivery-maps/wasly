import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    user: process.env.DB_USER || '2TsznmHar2ue24f.root',
    password: process.env.DB_PASSWORD || 'EcdJSdZ5TmFMDvyq',
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT || 4000,
    ssl: 'Amazon RDS',
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'drizzle', '0000_bright_lizard.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement-breakpoint
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} migration statements`);

    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
        console.log('✅ Statement executed successfully');
      } catch (error) {
        // Ignore table already exists errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⚠️  Table already exists, skipping...');
        } else {
          console.error('❌ Error executing statement:', error.message);
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

applyMigration();
