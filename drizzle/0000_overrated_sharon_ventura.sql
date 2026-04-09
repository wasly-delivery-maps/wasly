CREATE TABLE `driver_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`orderId` int,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` decimal(10,2),
	`speed` decimal(10,2),
	`heading` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`currentOrderId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_availability_id` PRIMARY KEY(`id`),
	CONSTRAINT `drivers_availability_driverId_unique` UNIQUE(`driverId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('order_assigned','order_accepted','order_in_transit','order_arrived','order_delivered','order_cancelled','new_order_available','system') NOT NULL DEFAULT 'system',
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`changedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`driverId` int,
	`pickupLocation` json NOT NULL,
	`deliveryLocation` json NOT NULL,
	`status` enum('pending','assigned','accepted','in_transit','arrived','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`price` decimal(10,2),
	`distance` decimal(10,2),
	`estimatedTime` int,
	`notes` text,
	`rating` int,
	`ratingComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deliveredAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`endpoint` varchar(500) NOT NULL,
	`keys` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`phone` varchar(20),
	`password` varchar(255),
	`name` varchar(100),
	`email` varchar(320),
	`role` enum('customer','driver','admin') NOT NULL DEFAULT 'customer',
	`isActive` boolean NOT NULL DEFAULT true,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`totalCommission` decimal(10,2) NOT NULL DEFAULT '0',
	`totalDebt` decimal(10,2) NOT NULL DEFAULT '0',
	`isBlocked` boolean NOT NULL DEFAULT false,
	`pendingCommission` decimal(10,2) NOT NULL DEFAULT '0',
	`paidCommission` decimal(10,2) NOT NULL DEFAULT '0',
	`accountStatus` enum('active','suspended','disabled') NOT NULL DEFAULT 'active',
	`loginMethod` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
