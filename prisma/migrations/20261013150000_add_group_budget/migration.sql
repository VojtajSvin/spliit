-- Additive only: optional per-group budget.
ALTER TABLE "Group" ADD COLUMN "budget" INTEGER,
ADD COLUMN "budgetFrom" DATE,
ADD COLUMN "budgetTo" DATE;
