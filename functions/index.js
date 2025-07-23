const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {createEvents} = require("ics");

admin.initializeApp();

// Live ICS feed for a user's shifts
// Example: /userCalendarICS?userId=USER_ID
exports.userCalendarICS = functions.https.onRequest(async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).send("Missing userId");
    return;
  }
  try {
    const shiftsSnap = await admin
        .firestore()
        .collection(`users/${userId}/submissions`)
        .get();
    const shifts = shiftsSnap.docs.map((doc) => doc.data());
    const events = shifts.map((shift) => {
      const [year, month, day] = shift.workDate.split("-").map(Number);
      const [startHour, startMinute] = shift.startTime ?
        shift.startTime.split(":").map(Number) : [0, 0];
      const [endHour, endMinute] = shift.endTime ?
        shift.endTime.split(":").map(Number) : [0, 0];
      return {
        start: [year, month, day, startHour, startMinute],
        end: [year, month, day, endHour, endMinute],
        title: shift.jobType,
        description:
          `Base Rate: ¥${shift.baseRate}\nNet Hours: ${shift.netHours}`,
      };
    });
    createEvents(
        events,
        (error, value) => {
          if (error) {
            res.status(500).send("Failed to generate calendar");
            return;
          }
          res.setHeader("Content-Type", "text/calendar");
          res.setHeader(
              "Content-Disposition",
              "attachment; filename=\"shifts.ics\"",
          );
          res.send(value);
        },
    );
  } catch (err) {
    res.status(500).send("Error fetching shifts: " + err.message);
  }
});
