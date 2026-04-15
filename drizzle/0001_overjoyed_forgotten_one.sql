CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nicho` varchar(255) NOT NULL,
	`cidades` text NOT NULL,
	`messageTemplate` text,
	`status` enum('ativa','inativa') NOT NULL DEFAULT 'inativa',
	`spreadsheetId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`nomeEmpresa` varchar(500) NOT NULL,
	`telefoneOriginal` varchar(50),
	`telefoneNormalizado` varchar(50),
	`cidade` varchar(255),
	`categoria` text,
	`endereco` text,
	`website` text,
	`statusWhatsApp` enum('pronto','sem_telefone') NOT NULL DEFAULT 'sem_telefone',
	`statusEnvio` enum('pending','sent','error') NOT NULL DEFAULT 'pending',
	`dataCaptura` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mining_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`campaignName` varchar(255),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`leadsFound` int NOT NULL DEFAULT 0,
	`duplicatesSkipped` int NOT NULL DEFAULT 0,
	`errorsCount` int NOT NULL DEFAULT 0,
	`status` enum('running','completed','error') NOT NULL DEFAULT 'running',
	`logMessages` text,
	CONSTRAINT `mining_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
