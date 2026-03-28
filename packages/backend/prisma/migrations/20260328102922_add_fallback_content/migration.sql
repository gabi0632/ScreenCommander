-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Display" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hardwareId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monitorIndex" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "posX" INTEGER NOT NULL,
    "posY" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "connectionType" TEXT NOT NULL DEFAULT 'HDMI',
    "portLabel" TEXT NOT NULL DEFAULT 'HDMI-1',
    "audioDeviceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "currentContentId" TEXT,
    "fallbackContentId" TEXT,
    CONSTRAINT "Display_currentContentId_fkey" FOREIGN KEY ("currentContentId") REFERENCES "Content" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Display_fallbackContentId_fkey" FOREIGN KEY ("fallbackContentId") REFERENCES "Content" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Display" ("audioDeviceId", "connectionType", "createdAt", "currentContentId", "hardwareId", "height", "id", "isEnabled", "isPrimary", "monitorIndex", "name", "portLabel", "posX", "posY", "status", "updatedAt", "width") SELECT "audioDeviceId", "connectionType", "createdAt", "currentContentId", "hardwareId", "height", "id", "isEnabled", "isPrimary", "monitorIndex", "name", "portLabel", "posX", "posY", "status", "updatedAt", "width" FROM "Display";
DROP TABLE "Display";
ALTER TABLE "new_Display" RENAME TO "Display";
CREATE UNIQUE INDEX "Display_hardwareId_key" ON "Display"("hardwareId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
