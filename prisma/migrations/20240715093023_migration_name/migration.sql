-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasCalendar" (
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CanvasCalendar_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasCalendar_url_key" ON "CanvasCalendar"("url");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasCalendar_userId_key" ON "CanvasCalendar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Broadcast_channelId_messageId_key" ON "Broadcast"("channelId", "messageId");

-- AddForeignKey
ALTER TABLE "CanvasCalendar" ADD CONSTRAINT "CanvasCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
