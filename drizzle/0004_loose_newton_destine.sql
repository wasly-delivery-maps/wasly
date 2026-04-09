ALTER TABLE `users` ADD `pendingCommission` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `paidCommission` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','suspended','disabled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspensionReason` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` timestamp;