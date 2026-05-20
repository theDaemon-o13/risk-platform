-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "isTechnical" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'zinc',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responsible" TEXT NOT NULL DEFAULT '',
    "resolutionDate" TEXT NOT NULL DEFAULT '',
    "damage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "linkedIncidents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskEvent" TEXT NOT NULL,
    "causes" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "influence" INTEGER NOT NULL DEFAULT 0,
    "businessLoss" INTEGER NOT NULL DEFAULT 0,
    "businessImpact" INTEGER NOT NULL DEFAULT 0,
    "totalLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseStrategy" TEXT NOT NULL DEFAULT '',
    "measures" TEXT NOT NULL DEFAULT '',
    "responsible" TEXT NOT NULL DEFAULT '',
    "monitoringFrequency" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Не исполняется',
    "comments" TEXT NOT NULL DEFAULT '',
    "linkedIncidents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskMap" (
    "id" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "subProcess" TEXT NOT NULL DEFAULT '',
    "processOwner" TEXT NOT NULL DEFAULT '',
    "asset" TEXT NOT NULL DEFAULT '',
    "assetCriticality" INTEGER NOT NULL DEFAULT 0,
    "ciaProperty" TEXT NOT NULL DEFAULT '',
    "threat" TEXT NOT NULL,
    "vulnerability" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "riskType" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "controls" TEXT NOT NULL DEFAULT '',
    "isoControls" TEXT NOT NULL DEFAULT '',
    "nistFunction" TEXT NOT NULL DEFAULT '',
    "controlEffectiveness" TEXT NOT NULL DEFAULT '',
    "residualProbability" INTEGER NOT NULL DEFAULT 0,
    "residualImpact" INTEGER NOT NULL DEFAULT 0,
    "riskAppetite" TEXT NOT NULL DEFAULT '',
    "treatmentDecision" TEXT NOT NULL DEFAULT '',
    "treatmentPlan" TEXT NOT NULL DEFAULT '',
    "treatmentOwner" TEXT NOT NULL DEFAULT '',
    "deadline" TEXT NOT NULL DEFAULT '',
    "kri" TEXT NOT NULL DEFAULT '',
    "identifiedAt" TEXT NOT NULL DEFAULT '',
    "lastReviewedAt" TEXT NOT NULL DEFAULT '',
    "nextReviewAt" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Открыт',
    "comments" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Incident_type_idx" ON "Incident"("type");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_date_idx" ON "Incident"("date");

-- CreateIndex
CREATE INDEX "Risk_status_idx" ON "Risk"("status");

-- CreateIndex
CREATE INDEX "Risk_category_idx" ON "Risk"("category");

-- CreateIndex
CREATE INDEX "RiskMap_status_idx" ON "RiskMap"("status");

-- CreateIndex
CREATE INDEX "RiskMap_riskType_idx" ON "RiskMap"("riskType");

-- CreateIndex
CREATE INDEX "RiskMap_nistFunction_idx" ON "RiskMap"("nistFunction");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

