// utils.js

export function convertTimeToDecimal(timeStr) {
  if (!timeStr) return 0;
  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  return hours + minutes / 60;
}

export function calculateRawDuration(startHour, endHour) {
  if (startHour == null || endHour == null) return 0;
  return endHour < startHour ? 24 - startHour + endHour : endHour - startHour;
}

// Get break minutes based on worked hours and criteria array [{hours, breakMinutes}]
export function getBreakMinutes(rawDuration, breakCriteria = []) {
  let breakMinutes = 0;
  for (const crit of breakCriteria) {
    if (rawDuration >= crit.hours) {
      breakMinutes = crit.breakMinutes;
    }
  }
  return breakMinutes;
}

// Calculate net hours after subtracting breaks
export function calculateNetHours(rawDuration, breakCriteria = []) {
  const breakMinutes = getBreakMinutes(rawDuration, breakCriteria);
  return rawDuration - breakMinutes / 60;
}

export function calculateTotalEarnings(netHours, baseRate) {
  return Math.round(netHours * baseRate);
}

export function computeWeekNumber(dateInput) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}
