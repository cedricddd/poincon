import { differenceInDays, startOfWeek, differenceInWeeks } from "date-fns";

export type RotationPeriodData = {
  id: string;
  order: number;
  label: string;
  shiftType: string | null;
  startTime: string | null;
  endTime: string | null;
  workDays: number[];
};

export type RotationCycleData = {
  id: string;
  name: string;
  periodUnit: "WEEK" | "DAY";
  anchorDate: Date;
  periods: RotationPeriodData[];
};

export type TeamWithRotation = {
  id: string;
  rotationCycle: RotationCycleData | null;
  rotationPhase: number | null;
};

/**
 * Returns the rotation period a team is in for a given target date.
 * Returns null if the team has no rotation cycle assigned.
 */
export function getCurrentPeriod(
  team: TeamWithRotation,
  targetDate: Date
): RotationPeriodData | null {
  const { rotationCycle, rotationPhase } = team;
  if (!rotationCycle || rotationPhase == null) return null;

  const { periods, periodUnit, anchorDate } = rotationCycle;
  if (periods.length === 0) return null;

  let unitsSinceAnchor: number;
  if (periodUnit === "WEEK") {
    const anchorWeek = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const targetWeek = startOfWeek(targetDate, { weekStartsOn: 1 });
    unitsSinceAnchor = differenceInWeeks(targetWeek, anchorWeek);
  } else {
    unitsSinceAnchor = differenceInDays(targetDate, anchorDate);
  }

  // Ensure positive modulo (handle dates before anchor)
  const rawIndex = (unitsSinceAnchor + rotationPhase) % periods.length;
  const periodIndex = ((rawIndex % periods.length) + periods.length) % periods.length;

  return periods.find((p) => p.order === periodIndex) ?? periods[periodIndex] ?? null;
}

/**
 * Returns the shift type string for a team on a given date, or null if rest/no rotation.
 */
export function getCurrentShiftType(
  team: TeamWithRotation,
  targetDate: Date
): string | null {
  return getCurrentPeriod(team, targetDate)?.shiftType ?? null;
}

/**
 * Returns a human-readable label for the current rotation phase of a team.
 * e.g. "Team A — Matin" or "Team B — Repos"
 */
export function getTeamPhaseBadge(
  teamName: string,
  team: TeamWithRotation,
  targetDate: Date
): string {
  const period = getCurrentPeriod(team, targetDate);
  if (!period) return teamName;
  return `${teamName} — ${period.label}`;
}

/**
 * Parses the workDays JSON string stored in RotationPeriod.
 */
export function parseWorkDays(workDaysJson: string): number[] {
  try {
    return JSON.parse(workDaysJson);
  } catch {
    return [1, 2, 3, 4, 5];
  }
}
