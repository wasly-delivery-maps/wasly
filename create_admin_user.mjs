import mysql from 'mysql2/promise';
import bcryptjs from 'bcryptjs';

async function createAdmin() {
  let connection;
  try {
    console.log('🔄 جاري الاتصال بـ TiDB...');
    
    connection = await mysql.createConnection({
      host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
      port: 4000,
      user: '2TsznmHar2ue24f.root',
      password: 'MrsonbThix8zlDfn',
      database: 'test',
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
      },
    });

    console.log('✅ تم الاتصال بـ TiDB بنجاح\n');

    // Hash password
    const hashedPassword = await bcryptjs.hash('12345aA@', 10);
    console.log('✓ تم تشفير كلمة المرور');

    // Insert admin user
    const query = `
      INSERT INTO users (openId, phone, password, name, email, role, isActive, createdAt, updatedAt, lastSignedIn)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      name = VALUES(name),
      role = VALUES(role),
      isActive = VALUES(isActive),
      updatedAt = NOW()
    `;

    const values = [
      'phone-01557564373',
      '01557564373',
      hashedPassword,
      'مسؤول النظام',
      'admin@wasly.app',
      'admin',
      1
    ];

    await connection.query(query, values);
    console.log('✅ تم إنشاء حساب المسؤول بنجاح!');
    console.log('\n📱 بيانات الدخول:');
    console.log('الهاتف: 01557564373');
    console.log('كلمة المرور: 12345aA@');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createAdmin();
