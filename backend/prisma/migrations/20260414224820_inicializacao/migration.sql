-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_orders` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `serviceType` VARCHAR(191) NOT NULL,
    `technician` VARCHAR(191) NOT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `value` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `work_orders_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotes` (
    `id` VARCHAR(191) NOT NULL,
    `quoteNumber` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'RASCUNHO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `quotes_quoteNumber_key`(`quoteNumber`),
    INDEX `quotes_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `amountPaid` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'RASCUNHO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    INDEX `invoices_clientId_idx`(`clientId`),
    INDEX `invoices_quoteId_idx`(`quoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NAO_INICIADO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `budget` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,

    INDEX `projects_clientId_idx`(`clientId`),
    INDEX `projects_quoteId_idx`(`quoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `projectId` VARCHAR(191) NOT NULL,

    INDEX `tasks_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expenses_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `receipt` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `project_expenses_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_notes` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'GERAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `project_notes_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `quantity` DOUBLE NOT NULL DEFAULT 0,
    `minStock` DOUBLE NULL,
    `maxStock` DOUBLE NULL,
    `barcode` VARCHAR(191) NULL,
    `supplier` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_items_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitPrice` DOUBLE NULL,
    `totalValue` DOUBLE NULL,
    `reason` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_line_items` (
    `id` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `stockItemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,

    INDEX `quote_line_items_quoteId_idx`(`quoteId`),
    INDEX `quote_line_items_stockItemId_idx`(`stockItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_line_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `stockItemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,

    INDEX `invoice_line_items_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_line_items_stockItemId_idx`(`stockItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NULL DEFAULT 'light',
    `notifications` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_notes` ADD CONSTRAINT `project_notes_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_items` ADD CONSTRAINT `stock_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `stock_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `stock_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_line_items` ADD CONSTRAINT `quote_line_items_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_line_items` ADD CONSTRAINT `quote_line_items_stockItemId_fkey` FOREIGN KEY (`stockItemId`) REFERENCES `stock_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_stockItemId_fkey` FOREIGN KEY (`stockItemId`) REFERENCES `stock_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
