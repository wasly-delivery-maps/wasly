import mysql from 'mysql2/promise';
import bcryptjs from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupDatabase() {
  let connection;
  try {
    console.log('🔄 جاري الاتصال بـ TiDB...');
    
    connection = await mysql.createConnection({
      host: process.env.TIDB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
      port: parseInt(process.env.TIDB_PORT || '4000'),
      user: process.env.TIDB_USER || '2TsmevHxrzuw24t.root',
      password: process.env.TIDB_PASSWORD || 'YumZ1YF13pCs6qf0',
      database: process.env.TIDB_DATABASE || 'test',
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
      },
    });

    console.log('✅ تم الاتصال بـ TiDB بنجاح\n');

    // التحقق من وجود الجداول
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );
    
    if (tables.length === 0) {
      console.log('📋 جاري إنشاء الجداول...');
      
      const migrationPath = path.join(__dirname, 'drizzle/migrations/0001_create_tables.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
      const queries = migrationSql.split(';').filter(q => q.trim());
      
      for (const query of queries) {
        if (query.trim()) {
          await connection.query(query);
        }
      }
      console.log('✅ تم إنشاء الجداول بنجاح\n');
    } else {
      console.log(`✅ وجدت ${tables.length} جداول موجودة بالفعل\n`);
    }

    // إنشاء حساب المسؤول
    console.log('👤 جاري إنشاء حساب المسؤول...');
    
    const hashedPassword = await bcryptjs.hash('12345aA@', 10);
    const openId = 'phone-01557564373';

    await connection.query(
      `INSERT INTO users (openId, phone, password, name, email, role, isActive, accountStatus, loginMethod)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       password = VALUES(password), 
       role = VALUES(role), 
       isActive = VALUES(isActive),
       accountStatus = VALUES(accountStatus)`,
      [
        openId,
        '01557564373',
        hashedPassword,
        'مسؤول النظام',
        'admin@wasly.app',
        'admin',
        true,
        'active',
        'phone'
      ]
    );

    console.log('✅ تم إنشاء حساب المسؤول بنجاح\n');
    console.log('📱 بيانات حساب المسؤول:');
    console.log('   الهاتف: 01557564373');
    console.log('   كلمة المرور: 12345aA@');
    console.log('   الدور: مسؤول النظام\n');

    await connection.end();
    console.log('✅ تم إغلاق الاتصال بنجاح');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();
