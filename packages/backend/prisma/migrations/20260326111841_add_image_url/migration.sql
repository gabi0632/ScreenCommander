-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TextMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "position" TEXT NOT NULL DEFAULT 'bottom',
    "fontSize" INTEGER NOT NULL DEFAULT 24,
    "fontColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "backgroundColor" TEXT NOT NULL DEFAULT '#000000CC',
    "animation" TEXT NOT NULL DEFAULT 'fade-in',
    "displayDuration" INTEGER NOT NULL DEFAULT 30,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "dismissedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TextMessage" ("animation", "backgroundColor", "createdAt", "dismissedAt", "displayDuration", "fontColor", "fontSize", "id", "position", "priority", "scheduledAt", "sentAt", "text") SELECT "animation", "backgroundColor", "createdAt", "dismissedAt", "displayDuration", "fontColor", "fontSize", "id", "position", "priority", "scheduledAt", "sentAt", "text" FROM "TextMessage";
DROP TABLE "TextMessage";
ALTER TABLE "new_TextMessage" RENAME TO "TextMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
