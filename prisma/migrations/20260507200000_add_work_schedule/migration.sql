-- CreateTable WorkSchedule
CREATE TABLE "WorkSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "weeklyHours" DOUBLE PRECISION NOT NULL DEFAULT 38,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "description" TEXT,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

-- AlterTable UserSchedule: add scheduleId
ALTER TABLE "UserSchedule" ADD COLUMN "scheduleId" TEXT;

-- CreateIndex
CREATE INDEX "WorkSchedule_type_idx" ON "WorkSchedule"("type");
CREATE INDEX "UserSchedule_scheduleId_idx" ON "UserSchedule"("scheduleId");

-- AddForeignKey
ALTER TABLE "UserSchedule" ADD CONSTRAINT "UserSchedule_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "WorkSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed preset work schedules
INSERT INTO "WorkSchedule" ("id", "name", "type", "startTime", "endTime", "hoursPerDay", "weeklyHours", "daysOfWeek", "description", "isPreset", "updatedAt") VALUES
  ('preset_journee',      'Journée standard',   'JOURNEE',  '09:00', '17:00', 8,  38, '[1,2,3,4,5]', 'Horaire de bureau classique, lundi-vendredi 9h-17h', true, CURRENT_TIMESTAMP),
  ('preset_2x8_m',        '2×8 Matin',          '2X8',      '06:00', '14:00', 8,  38, '[1,2,3,4,5]', 'Équipe du matin — système discontinu 2 équipes', true, CURRENT_TIMESTAMP),
  ('preset_2x8_am',       '2×8 Après-midi',     '2X8',      '14:00', '22:00', 8,  38, '[1,2,3,4,5]', 'Équipe de l''après-midi — système discontinu 2 équipes', true, CURRENT_TIMESTAMP),
  ('preset_3x8_m',        '3×8 Matin',          '3X8',      '06:00', '14:00', 8,  38, '[1,2,3,4,5]', 'Équipe du matin — système semi-continu 3 équipes', true, CURRENT_TIMESTAMP),
  ('preset_3x8_am',       '3×8 Après-midi',     '3X8',      '14:00', '22:00', 8,  38, '[1,2,3,4,5]', 'Équipe de l''après-midi — système semi-continu 3 équipes', true, CURRENT_TIMESTAMP),
  ('preset_3x8_n',        '3×8 Nuit',           '3X8',      '22:00', '06:00', 8,  38, '[1,2,3,4,5]', 'Équipe de nuit — système semi-continu 3 équipes', true, CURRENT_TIMESTAMP),
  ('preset_4x8_m',        '4×8 Matin',          '4X8',      '06:00', '14:00', 8,  42, '[1,2,3,4,5,6,7]', 'Matin — système continu 4 équipes (week-end inclus)', true, CURRENT_TIMESTAMP),
  ('preset_4x8_am',       '4×8 Après-midi',     '4X8',      '14:00', '22:00', 8,  42, '[1,2,3,4,5,6,7]', 'Après-midi — système continu 4 équipes (week-end inclus)', true, CURRENT_TIMESTAMP),
  ('preset_4x8_n',        '4×8 Nuit',           '4X8',      '22:00', '06:00', 8,  42, '[1,2,3,4,5,6,7]', 'Nuit — système continu 4 équipes (week-end inclus)', true, CURRENT_TIMESTAMP),
  ('preset_5x8_m',        '5×8 Matin',          '5X8',      '06:00', '14:00', 8,  38, '[1,2,3,4,5,6,7]', 'Matin — système continu 5 équipes 24/7', true, CURRENT_TIMESTAMP),
  ('preset_5x8_am',       '5×8 Après-midi',     '5X8',      '14:00', '22:00', 8,  38, '[1,2,3,4,5,6,7]', 'Après-midi — système continu 5 équipes 24/7', true, CURRENT_TIMESTAMP),
  ('preset_5x8_n',        '5×8 Nuit',           '5X8',      '22:00', '06:00', 8,  38, '[1,2,3,4,5,6,7]', 'Nuit — système continu 5 équipes 24/7', true, CURRENT_TIMESTAMP),
  ('preset_2x12_j',       '2×12 Jour',          '2X12',     '06:00', '18:00', 12, 42, '[1,2,3,4,5,6,7]', 'Quart de jour 12h — hôpitaux, sécurité, urgences', true, CURRENT_TIMESTAMP),
  ('preset_2x12_n',       '2×12 Nuit',          '2X12',     '18:00', '06:00', 12, 42, '[1,2,3,4,5,6,7]', 'Quart de nuit 12h — hôpitaux, sécurité, urgences', true, CURRENT_TIMESTAMP),
  ('preset_nuit_fixe',    'Nuit fixe',          'NUIT',     '22:00', '06:00', 8,  38, '[1,2,3,4,5]',     'Poste de nuit fixe (22h-6h), lundi-vendredi', true, CURRENT_TIMESTAMP),
  ('preset_partiel_4h',   'Temps partiel 4h',   'PARTIEL',  '09:00', '13:00', 4,  20, '[1,2,3,4,5]',     'Mi-temps matin — 20h/semaine', true, CURRENT_TIMESTAMP),
  ('preset_variable',     'Horaire variable',   'VARIABLE', '07:00', '19:00', 8,  38, '[1,2,3,4,5]',     'Plages fixes 9h-15h, arrivée flexible 7h-9h', true, CURRENT_TIMESTAMP);
