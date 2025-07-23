import { loadGapiInsideDOM } from 'gapi-script';
import { saveAs } from 'file-saver';
import { createEvents } from 'ics';

// utils.js
// --- Google Calendar & Apple Calendar (ICS) Sync Utilities ---
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

// --- Google Calendar & Apple Calendar (ICS) Sync Utilities ---
const GOOGLE_CLIENT_ID = '540225493834-2g6evhet2932tlq2b2a2t0lrc5a4gcr1.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyDYIW0ZDpwgVD3gWXhpUpWLet4zr93DESk';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];

export async function authenticateGoogleCalendar() {
  await loadGapiInsideDOM();
  const gapi = window.gapi;
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          clientId: GOOGLE_CLIENT_ID,
          discoveryDocs: GOOGLE_DISCOVERY_DOCS,
          scope: GOOGLE_SCOPES,
        });
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
          await authInstance.signIn();
        }
        resolve(gapi);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function exportShiftsToGoogleCalendar(shifts) {
  const gapi = await authenticateGoogleCalendar();
  for (const shift of shifts) {
    const event = {
      summary: shift.jobType,
      description: `Base Rate: ¥${shift.baseRate}\nNet Hours: ${shift.netHours}`,
      start: {
        dateTime: `${shift.workDate}T${shift.startTime}:00`,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: `${shift.workDate}T${shift.endTime}:00`,
        timeZone: 'Asia/Tokyo',
      },
    };
    await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
  }
}

export async function importShiftsFromGoogleCalendar() {
  const gapi = await authenticateGoogleCalendar();
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const response = await gapi.client.calendar.events.list({
    calendarId: 'primary',
    timeMin: oneYearAgo.toISOString(),
    timeMax: now.toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: 'startTime',
  });
  // Convert Google events to shift objects (basic mapping)
  return response.result.items.map(ev => ({
    jobType: ev.summary,
    workDate: ev.start.dateTime ? ev.start.dateTime.split('T')[0] : '',
    startTime: ev.start.dateTime ? ev.start.dateTime.split('T')[1].slice(0,5) : '',
    endTime: ev.end.dateTime ? ev.end.dateTime.split('T')[1].slice(0,5) : '',
    // Add more fields as needed
  }));
}

export function exportShiftsToICS(shifts) {
  const events = shifts.map(shift => {
    // Parse date and time
    const [year, month, day] = shift.workDate.split('-').map(Number);
    const [startHour, startMinute] = shift.startTime ? shift.startTime.split(':').map(Number) : [0, 0];
    const [endHour, endMinute] = shift.endTime ? shift.endTime.split(':').map(Number) : [0, 0];
    return {
      start: [year, month, day, startHour, startMinute],
      end: [year, month, day, endHour, endMinute],
      title: shift.jobType,
      description: `Base Rate: ¥${shift.baseRate}\nNet Hours: ${shift.netHours}`,
    };
  });
  createEvents(events, (error, value) => {
    if (!error) {
      const blob = new Blob([value], { type: 'text/calendar' });
      saveAs(blob, 'shifts.ics');
    } else {
      alert('Failed to generate .ics file: ' + error);
    }
  });
}

export function importShiftsFromICS(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const icsData = e.target.result;
        // Use a parser like ical.js or a custom parser here
        // For now, just resolve with raw data
        resolve(icsData);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
