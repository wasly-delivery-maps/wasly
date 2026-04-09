-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `phone` varchar(20) UNIQUE,
  `password` varchar(255),
  `name` varchar(100),
  `email` varchar(255),
  `role` enum('customer', 'driver', 'admin') NOT NULL DEFAULT 'customer',
  `isActive` boolean NOT NULL DEFAULT true,
  `latitude` decimal(10, 8),
  `longitude` decimal(11, 8),
  `totalCommission` decimal(10, 2) NOT NULL DEFAULT 0,
  `totalDebt` decimal(10, 2) NOT NULL DEFAULT 0,
  `isBlocked` boolean NOT NULL DEFAULT false,
  `pendingCommission` decimal(10, 2) NOT NULL DEFAULT 0,
  `paidCommission` decimal(10, 2) NOT NULL DEFAULT 0,
  `accountStatus` enum('active', 'suspended', 'disabled') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp,
  `loginMethod` varchar(64)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `customerId` int NOT NULL,
  `driverId` int,
  `pickupLocation` json NOT NULL,
  `deliveryLocation` json NOT NULL,
  `status` enum('pending', 'assigned', 'accepted', 'in_transit', 'arrived', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  `price` decimal(10, 2),
  `distance` decimal(10, 2),
  `estimatedTime` int,
  `notes` text,
  `rating` int,
  `ratingComment` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deliveredAt` timestamp
);

-- Create drivers_availability table
CREATE TABLE IF NOT EXISTS `drivers_availability` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `driverId` int NOT NULL UNIQUE,
  `latitude` decimal(10, 8) NOT NULL,
  `longitude` decimal(11, 8) NOT NULL,
  `isAvailable` boolean NOT NULL DEFAULT true,
  `currentOrderId` int,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `type` enum('order_assigned', 'order_accepted', 'order_in_transit', 'order_arrived', 'order_delivered', 'order_cancelled', 'new_order_available', 'system') NOT NULL DEFAULT 'system',
  `isRead` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `readAt` timestamp
);

-- Create order_history table
CREATE TABLE IF NOT EXISTS `order_history` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `orderId` int NOT NULL,
  `status` varchar(50) NOT NULL,
  `changedBy` int,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
