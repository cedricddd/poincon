// Net hours balance shown to the employee and the admin: approved overtime minus hours
// taken back as recovery (RTT). Paid leave is not a debt of hours in Belgian law, so it
// never enters this balance; leave is reported separately, in days.
export function netHoursBalance(overtimeHours: number, rttHours: number): number {
  return overtimeHours - rttHours
}
