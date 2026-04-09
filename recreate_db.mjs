import mysql from 'mysql2/promise';

async function run() { 
  const conn = await mysql.createConnection({ 
    host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com', 
    port: 4000, 
    user: '2TsznmHar2ue24f.root', 
    password: 'EcdJSdZ5TmFMDvyq', 
    database: 'test', 
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
    multipleStatements: true
  }); 

  console.log('🔄 جاري حذف الجداول القديمة...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
  const tables = ['users', 'orders', 'drivers_availability', 'notifications', 'order_history', 'driver_locations', 'push_subscriptions'];
  for (const table of tables) {
    await conn.query(`DROP TABLE IF EXISTS ${table}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('✅ تم حذف الجداول بنجاح. جاري إنشاء الجداول الجديدة...');

  const sql = `
    CREATE TABLE users (
      id int(11) NOT NULL AUTO_INCREMENT,
      openId varchar(64) NOT NULL,
      phone varchar(20) DEFAULT NULL,
      password varchar(255) DEFAULT NULL,
      name varchar(100) DEFAULT NULL,
      email varchar(255) DEFAULT NULL,
      role enum('customer','driver','admin') NOT NULL DEFAULT 'customer',
      isActive tinyint(1) NOT NULL DEFAULT '1',
      latitude decimal(10,8) DEFAULT NULL,
      longitude decimal(11,8) DEFAULT NULL,
      totalCommission decimal(10,2) NOT NULL DEFAULT '0.00',
      totalDebt decimal(10,2) NOT NULL DEFAULT '0.00',
      isBlocked tinyint(1) NOT NULL DEFAULT '0',
      pendingCommission decimal(10,2) NOT NULL DEFAULT '0.00',
      paidCommission decimal(10,2) NOT NULL DEFAULT '0.00',
      accountStatus enum('active','suspended','disabled') NOT NULL DEFAULT 'active',
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      lastSignedIn timestamp NULL DEFAULT NULL,
      loginMethod varchar(64) DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY openId (openId),
      UNIQUE KEY phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE orders (
      id int(11) NOT NULL AUTO_INCREMENT,
      customerId int(11) NOT NULL,
      driverId int(11) DEFAULT NULL,
      pickupLocation json NOT NULL,
      deliveryLocation json NOT NULL,
      status enum('pending','assigned','accepted','in_transit','arrived','delivered','cancelled') NOT NULL DEFAULT 'pending',
      price decimal(10,2) DEFAULT NULL,
      distance decimal(10,2) DEFAULT NULL,
      estimatedTime int(11) DEFAULT NULL,
      notes text DEFAULT NULL,
      rating int(11) DEFAULT NULL,
      ratingComment text DEFAULT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deliveredAt timestamp NULL DEFAULT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE drivers_availability (
      id int(11) NOT NULL AUTO_INCREMENT,
      driverId int(11) NOT NULL,
      latitude decimal(10,8) NOT NULL,
      longitude decimal(11,8) NOT NULL,
      isAvailable tinyint(1) NOT NULL DEFAULT '1',
      currentOrderId int(11) DEFAULT NULL,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY driverId (driverId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE notifications (
      id int(11) NOT NULL AUTO_INCREMENT,
      userId int(11) NOT NULL,
      title varchar(255) NOT NULL,
      content text NOT NULL,
      type enum('order_assigned','order_accepted','order_in_transit','order_arrived','order_delivered','order_cancelled','new_order_available','system') NOT NULL DEFAULT 'system',
      isRead tinyint(1) NOT NULL DEFAULT '0',
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      readAt timestamp NULL DEFAULT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE order_history (
      id int(11) NOT NULL AUTO_INCREMENT,
      orderId int(11) NOT NULL,
      status varchar(50) NOT NULL,
      changedBy int(11) DEFAULT NULL,
      notes text DEFAULT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE driver_locations (
      id int(11) NOT NULL AUTO_INCREMENT,
      driverId int(11) NOT NULL,
      orderId int(11) DEFAULT NULL,
      latitude decimal(10,8) NOT NULL,
      longitude decimal(11,8) NOT NULL,
      accuracy decimal(10,2) DEFAULT NULL,
      speed decimal(10,2) DEFAULT NULL,
      heading decimal(10,2) DEFAULT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE push_subscriptions (
      id int(11) NOT NULL AUTO_INCREMENT,
      userId int(11) NOT NULL,
      endpoint varchar(500) NOT NULL,
      \`keys\` json NOT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY endpoint_unique (endpoint)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    await conn.query(statement);
  }

  console.log('✅ تم إنشاء جميع الجداول بنجاح!');
  await conn.end();
}

run().catch(console.error);
