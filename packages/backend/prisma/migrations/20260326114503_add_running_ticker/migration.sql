-- CreateTable
CREATE TABLE "TickerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backgroundColor" TEXT NOT NULL DEFAULT '#cc0000',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontSize" INTEGER NOT NULL DEFAULT 28,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "separator" TEXT NOT NULL DEFAULT ' ■ ',
    "showClock" BOOLEAN NOT NULL DEFAULT true,
    "clockPosition" TEXT NOT NULL DEFAULT 'left',
    "targetDisplayIds" TEXT NOT NULL DEFAULT 'all',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TickerMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "configId" TEXT NOT NULL DEFAULT 'singleton',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TickerMessage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "TickerConfig" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
