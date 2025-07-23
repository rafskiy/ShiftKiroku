import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Button, IconButton, Checkbox, Grid, Snackbar, Alert, CircularProgress, Chip, Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import { exportShiftsToICS } from '../utils';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const projectId = "work-hour-tracker-56ae1"; // Replace with your actual project ID

export default function AddToCalendar() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); // selected shift IDs
  const [copyOpen, setCopyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const navigate = useNavigate();

  // Auth and fetch shifts
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate("/");
      } else {
        setUser(u);
      }
    });
    return unsubAuth;
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, `users/${user.uid}/submissions`));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setShifts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ICS feed URL
  const icsFeedUrl = user ? `https://us-central1-${projectId}.cloudfunctions.net/userCalendarICS?userId=${user.uid}` : '';

  // Get all dates with shifts
  const shiftDates = useMemo(() => {
    return Array.from(new Set(shifts.map(s => s.workDate)));
  }, [shifts]);

  // Shifts for the selected day
  const shiftsForDay = useMemo(() => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return shifts.filter(s => s.workDate === dateStr);
  }, [shifts, selectedDate]);

  // Custom day renderer to highlight days with shifts
  function renderDay(day, _value, DayComponentProps) {
    const dateStr = day.format('YYYY-MM-DD');
    const hasShift = shiftDates.includes(dateStr);
    return (
      <PickersDay
        {...DayComponentProps}
        sx={hasShift ? { bgcolor: 'primary.light', color: 'primary.contrastText' } : {}}
      />
    );
  }

  // Handle individual select
  const handleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  // When a date is selected, toggle selection of all shifts for that date
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    const dateStr = date.format('YYYY-MM-DD');
    const shiftsForThisDay = shifts.filter(s => s.workDate === dateStr).map(s => s.id);
    const allSelected = shiftsForThisDay.every(id => selected.includes(id));
    if (allSelected) {
      // Deselect all shifts for this date
      setSelected(prev => prev.filter(id => !shiftsForThisDay.includes(id)));
    } else {
      // Select all shifts for this date (add any not already selected)
      setSelected(prev => Array.from(new Set([...prev, ...shiftsForThisDay])));
    }
  };

  // Get all selected dates (dates with at least one shift selected)
  const selectedDates = useMemo(() => {
    const dateMap = {};
    shifts.forEach(s => {
      if (selected.includes(s.id)) {
        if (!dateMap[s.workDate]) dateMap[s.workDate] = 0;
        dateMap[s.workDate]++;
      }
    });
    return Object.keys(dateMap).sort();
  }, [shifts, selected]);

  // Remove all selected shifts for a given date
  const handleRemoveDate = (date) => {
    const shiftIdsForDate = shifts.filter(s => s.workDate === date).map(s => s.id);
    setSelected(prev => prev.filter(id => !shiftIdsForDate.includes(id)));
  };

  // Copy ICS URL
  const handleCopy = () => {
    navigator.clipboard.writeText(icsFeedUrl);
    setCopyOpen(true);
  };

  // Export selected shifts
  const handleExport = () => {
    const toExport = shifts.filter(s => selected.includes(s.id));
    exportShiftsToICS(toExport);
    setExportOpen(true);
  };

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box maxWidth={600} mx="auto" p={2}>
      <Typography variant="h4" mb={2} textAlign="center">📅 Add to Calendar</Typography>
      <Typography variant="body1" mb={3} textAlign="center">
        Easily sync your shifts with your favorite calendar app.
      </Typography>

      {/* Live ICS Feed Section */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" flex={1}>🔗 Live Calendar Feed</Typography>
          <IconButton onClick={handleCopy} size="small" aria-label="Copy ICS URL">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'primary.main', mb: 1 }}>
          {icsFeedUrl}
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={1}>
          Subscribe to this link in your calendar app for automatic updates.
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 1 }}>
          <li><b>Google Calendar:</b> Other calendars → Add by URL → paste the link above.</li>
          <li><b>Apple Calendar (Mac):</b> File → New Calendar Subscription → paste the link.</li>
          <li><b>iPhone/iPad:</b> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.</li>
          <li><b>Outlook:</b> Add calendar → Subscribe from web → paste the link.</li>
        </Box>
        <Typography variant="caption" color="textSecondary">
          <b>Note:</b> Calendar apps refresh feeds automatically, but not instantly. Google Calendar may take up to 24 hours. Apple Calendar (Mac) lets you set the refresh interval. iPhone/iPad and Outlook typically refresh every few hours.
        </Typography>
      </Paper>

      {/* Manual Export Section with Mini Calendar */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={1}>📝 Manual Export Selected Shifts</Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar
            value={selectedDate}
            onChange={handleDateSelect}
            renderDay={renderDay}
            sx={{ mb: 2, mx: 'auto' }}
          />
        </LocalizationProvider>
        {/* Show selected dates as chips */}
        {selectedDates.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
              mb: 2,
              minHeight: 48,
            }}
          >
            {selectedDates.map(date => (
              <Chip
                key={date}
                label={date}
                color="primary"
                onDelete={() => handleRemoveDate(date)}
                sx={{ maxWidth: 120, m: 0 }}
              />
            ))}
          </Box>
        )}
        <Box mb={2}>
          <Typography variant="subtitle2" mb={1}>
            Shifts on {selectedDate.format('YYYY-MM-DD')}:
          </Typography>
          {shiftsForDay.length === 0 ? (
            <Typography variant="body2" color="textSecondary">No shifts for this day.</Typography>
          ) : (
            <Grid container spacing={1}>
              {shiftsForDay.map(shift => (
                <Grid item xs={12} key={shift.id}>
                  <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', mb: 1, bgcolor: selected.includes(shift.id) ? 'primary.lighter' : undefined }}>
                    <Checkbox
                      checked={selected.includes(shift.id)}
                      onChange={() => handleSelect(shift.id)}
                      size="small"
                    />
                    <Box>
                      <Typography variant="body2"><b>{shift.jobType}</b></Typography>
                      <Typography variant="caption" color="textSecondary">
                        {shift.startTime}–{shift.endTime} | ¥{shift.baseRate}/h | {shift.netHours}h
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
        <Button
          variant="contained"
          color="primary"
          disabled={selected.length === 0}
          onClick={handleExport}
          sx={{ mt: 2 }}
          fullWidth
        >
          Export Selected to Calendar (.ics)
        </Button>
        <Typography variant="caption" color="textSecondary" display="block" mt={1}>
          Import this file into your calendar for instant updates. No auto-sync.
        </Typography>
      </Paper>

      {/* Snackbars for feedback */}
      <Snackbar open={copyOpen} autoHideDuration={2000} onClose={() => setCopyOpen(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>ICS feed link copied!</Alert>
      </Snackbar>
      <Snackbar open={exportOpen} autoHideDuration={2000} onClose={() => setExportOpen(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>ICS file exported!</Alert>
      </Snackbar>
    </Box>
  );
} 