import mysql from 'mysql2/promise';
import fs from 'fs';

async function applyMigration() {
  let connection;
  try {
    console.log('🔄 جاري الاتصال بـ TiDB...');
    
    connection = await mysql.createConnection({
      host: process.env.TIDB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
      port: parseInt(process.env.TIDB_PORT || '4000'),
      user: process.env.TIDB_USER || '2TsznmHar2ue24f.root',
      password: process.env.TIDB_PASSWORD || 'MrsonbThix8zlDfn',
      database: process.env.TIDB_DATABASE || 'test',
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
      },
    });

    console.log('✅ تم الاتصال بـ TiDB بنجاح\n');

    // قراءة ملف الهجرة
    const migrationSql = fs.readFileSync('./drizzle/0000_overrated_sharon_ventura.sql', 'utf-8');
    const queries = migrationSql.split('--> statement-breakpoint').filter(q => q.trim());
    
    console.log(`📋 جاري تطبيق ${queries.length} استعلام...`);
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (query) {
        try {
          await connection.query(query);
          console.log(`✓ استعلام ${i + 1}/${queries.length} تم بنجاح`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠ استعلام ${i + 1}/${queries.length} موجود بالفعل (تم تجاهله)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ تم تطبيق الهجرة بنجاح');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

applyMigration();
