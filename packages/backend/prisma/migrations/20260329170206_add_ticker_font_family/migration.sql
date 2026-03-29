-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TickerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backgroundColor" TEXT NOT NULL DEFAULT '#cc0000',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontSize" INTEGER NOT NULL DEFAULT 28,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "separator" TEXT NOT NULL DEFAULT ' ■ ',
    "fontFamily" TEXT NOT NULL DEFAULT 'Heebo',
    "showClock" BOOLEAN NOT NULL DEFAULT true,
    "clockPosition" TEXT NOT NULL DEFAULT 'left',
    "targetDisplayIds" TEXT NOT NULL DEFAULT 'all',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TickerConfig" ("backgroundColor", "clockPosition", "createdAt", "fontSize", "id", "isEnabled", "separator", "showClock", "speed", "targetDisplayIds", "textColor", "updatedAt") SELECT "backgroundColor", "clockPosition", "createdAt", "fontSize", "id", "isEnabled", "separator", "showClock", "speed", "targetDisplayIds", "textColor", "updatedAt" FROM "TickerConfig";
DROP TABLE "TickerConfig";
ALTER TABLE "new_TickerConfig" RENAME TO "TickerConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
