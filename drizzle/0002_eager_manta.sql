CREATE TABLE `dispatch_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`telefoneNormalizado` varchar(50) NOT NULL,
	`nomeEmpresa` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`retries` int NOT NULL DEFAULT 0,
	`sendAfter` timestamp NOT NULL,
	`status` enum('pending','processing','sent','error') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `bloqueado` boolean DEFAULT false NOT NULL;