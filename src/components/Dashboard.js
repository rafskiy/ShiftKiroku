import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Box,
  Tab,
  Typography,
  MenuItem,
  Select,
  Button,
  useTheme,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import dayjs from "dayjs";
import { exportShiftsToICS } from '../utils';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Tooltip from '@mui/material/Tooltip';
import { convertTimeToDecimal, calculateRawDuration, calculateNetHours, getBreakMinutes, computeWeekNumber } from '../utils';

function isBreakPeriod(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();

  // Winter break: Dec 20 (previous year) – Jan 10
  const winterStart = new Date(year - 1, 11, 20);
  const winterEnd = new Date(year, 0, 10);

  // Spring break: Feb 1 – Mar 31
  const springStart = new Date(year, 1, 1);
  const springEnd = new Date(year, 2, 31);

  // Summer break: Aug 1 – Sep 30
  const summerStart = new Date(year, 7, 1);  // August is month 7 (0-based)
  const summerEnd = new Date(year, 8, 30);   // September is month 8

  return (
    (date >= winterStart && date <= winterEnd) ||
    (date >= springStart && date <= springEnd) ||
    (date >= summerStart && date <= summerEnd)
  );
}

// Add this function to generate the Google Calendar event link
function openGoogleCalendarEvent(shift) {
  // Format: YYYYMMDDTHHmmssZ (UTC)
  const start = `${shift.workDate.replace(/-/g, '')}T${shift.startTime.replace(':', '')}00Z`;
  const end = `${shift.workDate.replace(/-/g, '')}T${shift.endTime.replace(':', '')}00Z`;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(shift.jobType)}&dates=${start}/${end}&details=${encodeURIComponent('Base Rate: ¥' + shift.baseRate + '\nNet Hours: ' + shift.netHours)}`;
  window.open(url, '_blank');
}

// Custom event component for calendar
function CalendarEvent({ event }) {
  // Ensure event.title is always defined
  const title = event && event.title ? event.title : '';
  return (
    <Tooltip title={
      event && event.resource ?
        `${event.resource.jobType}\n${event.resource.workDate} ${event.resource.startTime}–${event.resource.endTime}\n¥${event.resource.baseRate}/h | ${event.resource.netHours}h`
        : ''
    } arrow>
      <span style={{
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '0.85em',
        maxWidth: '100%',
      }}>{title}</span>
    </Tooltip>
  );
}

// Custom Toolbar for react-big-calendar
function ViewToolbar({ label, onView, currentView }) {
  return (
    <Box display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" gap={2} mt={2} mb={2}>
      <Button
        variant={currentView === 'month' ? 'contained' : 'outlined'}
        onClick={() => onView('month')}
        sx={{ minWidth: 80 }}
      >
        Month
      </Button>
      <Button
        variant={currentView === 'week' ? 'contained' : 'outlined'}
        onClick={() => onView('week')}
        sx={{ minWidth: 80 }}
      >
        Week
      </Button>
      <Typography variant="subtitle1" sx={{ ml: 2 }}>{label}</Typography>
    </Box>
  );
}

function NavToolbar({ onNavigate }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2} mb={2}>
      <Button variant="outlined" onClick={() => onNavigate('PREV')}>Back</Button>
      <Button variant="outlined" onClick={() => onNavigate('TODAY')}>Today</Button>
      <Button variant="outlined" onClick={() => onNavigate('NEXT')}>Next</Button>
    </Box>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [currentTab, setCurrentTab] = useState("monthly");
  const [filterJob, setFilterJob] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month()); // 0-based month
  const currentYear = dayjs().year();
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({ jobType: '', start: null, end: null });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectingRange, setSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeMessage, setRangeMessage] = useState('');
  const [jobs, setJobs] = useState([]);
  const isDark = theme.palette.mode === 'dark';
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [calendarDateState, setCalendarDateState] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');
  // Add state for selected bar
  const [selectedWeekBar, setSelectedWeekBar] = useState(null); // for monthly tab
  const [selectedMonthBar, setSelectedMonthBar] = useState(null); // for yearly tab

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/");
      else setUser(u);
    });
    return unsubAuth;
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/submissions`));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSubmissions(data);
    });
    return () => unsub();
  }, [user]);

  // Fetch jobs for the user
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/jobs`));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    });
    return () => unsub();
  }, [user]);

  const filteredSubs = submissions.filter(
    (s) => filterJob === "all" || s.jobType === filterJob
  );

  const uniqueJobs = [...new Set(submissions.map((s) => s.jobType))];

  // Weekly totals for selected month (monthly tab)
  const weeklyTotals = filteredSubs
    .filter((s) => {
      const d = new Date(s.workDate);
      return d.getFullYear() === currentYear && d.getMonth() === selectedMonth;
    })
    .reduce((acc, s) => {
      const week = s.weekNumber || "Unknown";
      if (!acc[week]) acc[week] = 0;
      acc[week] += typeof s.totalEarnings === "number" ? s.totalEarnings : 0;
      return acc;
    }, {});
  const weeklyDataForMonth = Object.entries(weeklyTotals).map(([week, total]) => ({
    week,
    total,
  }));

  // Monthly totals for current year (yearly tab)
  const monthlyTotals = filteredSubs
    .filter((s) => new Date(s.workDate).getFullYear() === currentYear)
    .reduce((acc, s) => {
      const date = new Date(s.workDate);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (!acc[month]) acc[month] = 0;
      acc[month] += typeof s.totalEarnings === "number" ? s.totalEarnings : 0;
      return acc;
    }, {});
  const monthlyDataForYear = Object.entries(monthlyTotals).map(([month, total]) => ({
    month,
    total,
  }));

  // Group submissions by week for weekly details
  const groupedByWeek = {};
  filteredSubs.forEach((s) => {
    const week = s.weekNumber || "Unknown";
    const isBreak = isBreakPeriod(s.workDate);
    const weeklyLimit = isBreak ? 40 : 28;
    if (!groupedByWeek[week]) groupedByWeek[week] = { submissions: [], totalHours: 0, weeklyLimit };
    groupedByWeek[week].submissions.push(s);
    groupedByWeek[week].totalHours += s.netHours;
    groupedByWeek[week].weeklyLimit = weeklyLimit; // always update in case of multiple entries
  });

  // Get all dates with shifts
  const shiftDates = React.useMemo(() => {
    return Array.from(new Set(submissions.map(s => s.workDate)));
  }, [submissions]);

  // Shifts for the selected day
  const shiftsForDay = React.useMemo(() => {
    const dateStr = calendarDate.format('YYYY-MM-DD');
    return submissions.filter(s => s.workDate === dateStr);
  }, [submissions, calendarDate]);

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

  // Modal handlers
  const openDeleteModal = (id) => {
    setToDeleteId(id);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setToDeleteId(null);
  };
  const confirmDelete = async () => {
    if (!toDeleteId || !user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/submissions`, toDeleteId));
      closeModal();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete submission.");
    }
  };

  // --- Calendar Sync Handlers ---
  const handleGoogleExport = () => {
    if (!submissions.length) {
      alert('No shifts to export!');
      return;
    }
    // For each shift, open a new Google Calendar event tab
    submissions.forEach(openGoogleCalendarEvent);
    alert('Opened Google Calendar event(s) in new tab(s). Please review and save each event.');
  };
  const handleAppleExport = () => {
    if (!submissions.length) {
      alert('No shifts to export!');
      return;
    }
    exportShiftsToICS(submissions);
  };

  // Handle slot selection for adding a shift
  const handleSelectSlot = ({ start, end, action }) => {
    const isMobile = window.innerWidth < 600;
    if (isMobile) {
      // Two-tap system for mobile
      if (!selectingRange) {
        setRangeStart(start);
        setSelectingRange(true);
        setRangeMessage('Now select end time');
      } else {
        const finalEnd = start > rangeStart ? start : rangeStart;
        const finalStart = start > rangeStart ? rangeStart : start;
        setNewShift({
          jobType: '',
          start: finalStart,
          end: finalEnd,
        });
        setSelectedSlot({ start: finalStart, end: finalEnd });
        setAddModalOpen(true);
        setSelectingRange(false);
        setRangeStart(null);
        setRangeMessage('');
      }
    } else {
      // Desktop: use drag-to-select or single click
      setNewShift({
        jobType: '',
        start,
        end,
      });
      setSelectedSlot({ start, end });
      setAddModalOpen(true);
      setSelectingRange(false);
      setRangeStart(null);
      setRangeMessage('');
    }
  };

  // Handle input change in modal
  const handleModalChange = (e) => {
    const { name, value } = e.target;
    if (name === 'jobType') {
      const job = jobs.find(j => j.jobName === value);
      setNewShift({
        ...newShift,
        jobType: value,
        baseRate: job ? Number(job.basePay) : 0,
        breakCriteria: job ? job.breakCriteria || [] : [],
        hasWeekendBonus: job ? job.hasWeekendBonus || false : false,
      });
    } else {
      setNewShift({
        ...newShift,
        [name]: value,
      });
    }
  };

  // Handle modal submit
  const handleAddShift = async () => {
    if (!user || !newShift.jobType || !newShift.start || !newShift.end) return;
    // Parse date and time
    const workDate = newShift.start.toISOString().slice(0, 10);
    const startTime = newShift.start.toTimeString().slice(0, 5);
    const endTime = newShift.end.toTimeString().slice(0, 5);
    const startDecimal = convertTimeToDecimal(startTime);
    const endDecimal = convertTimeToDecimal(endTime);
    const rawDurationUnrounded = calculateRawDuration(startDecimal, endDecimal);
    const rawDuration = Math.round(rawDurationUnrounded * 100) / 100;
    const netHours = calculateNetHours(rawDuration, newShift.breakCriteria);
    const workDateObj = new Date(workDate);
    const isWeekend = workDateObj.getDay() === 0 || workDateObj.getDay() === 6;
    const weekendBonusAmount = isWeekend && newShift.hasWeekendBonus ? netHours * 30 : 0;
    const totalEarnings = Math.round(netHours * newShift.baseRate + weekendBonusAmount);
    const weekNumber = computeWeekNumber(workDate);
    await addDoc(collection(db, `users/${user.uid}/submissions`), {
      jobType: newShift.jobType,
      baseRate: newShift.baseRate,
      workDate,
      startTime,
      endTime,
      startDecimal,
      endDecimal,
      rawDuration,
      breaks: getBreakMinutes(rawDuration, newShift.breakCriteria),
      netHours,
      weekendBonus: weekendBonusAmount,
      totalEarnings,
      weekNumber,
      breakCriteria: newShift.breakCriteria,
      hasWeekendBonus: newShift.hasWeekendBonus,
      createdAt: new Date(),
    });
    setAddModalOpen(false);
  };

  // When closing the modal, reset selectingRange and rangeStart
  const handleCloseModal = () => {
    setAddModalOpen(false);
    setSelectedSlot(null);
    setSelectingRange(false);
    setRangeStart(null);
    setRangeMessage('');
  };

  // react-big-calendar setup
  const locales = { 'en-US': enUS };
  const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
  // Convert submissions to calendar events
  const events = submissions.map(shift => ({
    id: shift.id,
    title: shift.jobType, // only job name
    start: dayjs(`${shift.workDate}T${shift.startTime}`).toDate(),
    end: dayjs(`${shift.workDate}T${shift.endTime}`).toDate(),
    allDay: false,
    resource: shift,
  }));
  // Event click handler
  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource); // event.resource is the shift object
    setEventDialogOpen(true);
  };

  const handleCalendarNavigate = (date) => {
    setCalendarDateState(date);
  };
  const handleCalendarView = (view) => {
    setCalendarView(view);
  };

  const handleToolbarNavigate = (action) => {
    let newDate = new Date(calendarDateState);
    if (action === 'TODAY') {
      newDate = new Date();
    } else if (action === 'NEXT') {
      if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else if (calendarView === 'week') newDate.setDate(newDate.getDate() + 7);
      else if (calendarView === 'day') newDate.setDate(newDate.getDate() + 1);
    } else if (action === 'PREV') {
      if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (calendarView === 'week') newDate.setDate(newDate.getDate() - 7);
      else if (calendarView === 'day') newDate.setDate(newDate.getDate() - 1);
    }
    setCalendarDateState(newDate);
  };

  // Responsive calendar height based on screen width
  const calendarHeight = window.innerWidth < 600 ? 350 : 480;

  if (!user) return <Typography>Loading Dashboard...</Typography>;

  return (
    <Box
      maxWidth={1000}
      mx="auto"
      p={3}
      bgcolor={theme.palette.mode === "dark" ? "#121212" : "#e6f0ff"}
      color={theme.palette.text.primary}
      borderRadius={2}
      boxShadow={3}
    >
      {isDark && (
        <style>{`
          .rbc-toolbar button {
            color: #fff !important;
            background: #333 !important;
            border: 1px solid #444 !important;
            border-radius: 6px !important;
            padding: 6px 16px !important;
            margin: 0 4px !important;
            font-weight: 500 !important;
            transition: background 0.2s, color 0.2s, box-shadow 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          }
          .rbc-toolbar button:hover,
          .rbc-toolbar button:focus {
            background: #1976d2 !important;
            color: #fff !important;
            border-color: #1976d2 !important;
            box-shadow: 0 4px 16px rgba(25,118,210,0.15);
          }
          .rbc-toolbar button.rbc-active {
            background: #1976d2 !important;
            color: #fff !important;
            border-color: #1976d2 !important;
            font-weight: bold !important;
            box-shadow: 0 4px 16px rgba(25,118,210,0.18);
          }
          @media (max-width: 600px) {
            .rbc-toolbar {
              flex-direction: column;
              gap: 8px;
            }
            .rbc-event {
              font-size: 0.95em !important;
              padding: 8px 4px !important;
              min-height: 40px !important;
              border-radius: 8px !important;
            }
            .rbc-agenda-view, .rbc-time-view {
              /* Hide agenda/time view if present */
              /* display: none !important; */
            }
          }
        `}</style>
      )}
      {!isDark && (
        <style>{`
          .rbc-toolbar button {
            color: #1976d2 !important;
            background: #fff !important;
            border: 1px solid #90caf9 !important;
            border-radius: 6px !important;
            padding: 6px 16px !important;
            margin: 0 4px !important;
            font-weight: 500 !important;
            transition: background 0.2s, color 0.2s, box-shadow 0.2s;
            box-shadow: 0 2px 8px rgba(33,150,243,0.08);
          }
          .rbc-toolbar button:hover,
          .rbc-toolbar button:focus {
            background: #e3f2fd !important;
            color: #1976d2 !important;
            border-color: #1976d2 !important;
            box-shadow: 0 4px 16px rgba(33,150,243,0.13);
          }
          .rbc-toolbar button.rbc-active {
            background: #1976d2 !important;
            color: #fff !important;
            border-color: #1976d2 !important;
            font-weight: bold !important;
            box-shadow: 0 4px 16px rgba(25,118,210,0.18);
          }
          @media (max-width: 600px) {
            .rbc-toolbar {
              flex-direction: column;
              gap: 8px;
            }
            .rbc-event {
              font-size: 0.95em !important;
              padding: 8px 4px !important;
              min-height: 40px !important;
              border-radius: 8px !important;
            }
            .rbc-agenda-view, .rbc-time-view {
              /* Hide agenda/time view if present */
              /* display: none !important; */
            }
          }
        `}</style>
      )}
      {/* Shift Calendar */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={1}>🗓️ Your Shift Calendar</Typography>
        <ViewToolbar
          label={calendarDateState.toLocaleDateString(undefined, 
    calendarView === 'month'
      ? { year: 'numeric', month: 'long' }
      : { year: 'numeric', month: 'long', day: 'numeric' }
  )}
  onView={handleCalendarView}
  currentView={calendarView}
/>
        <div
          style={{
            height: calendarHeight,
            background: isDark ? '#222' : 'white',
            borderRadius: 8,
            marginBottom: 16,
            width: '100%',
            maxWidth: '100%',
            overflow: 'auto', // allow horizontal scroll on mobile
          }}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: calendarHeight, borderRadius: 8, minWidth: 320 }}
            onSelectEvent={handleSelectEvent}
            popup
            selectable
            onSelectSlot={handleSelectSlot}
            views={['month', 'week', 'day']}
            view={calendarView}
            onView={handleCalendarView}
            date={calendarDateState}
            onNavigate={handleCalendarNavigate}
            toolbar={false}
            dayPropGetter={() => ({ style: { background: isDark ? '#222' : 'white', color: isDark ? '#fff' : '#000' } })}
            eventPropGetter={() => ({ style: { background: isDark ? '#1976d2' : '#90caf9', color: isDark ? '#fff' : '#000', borderRadius: 6, border: 0 } })}
            components={{ event: CalendarEvent }}
          />
        </div>
        <NavToolbar onNavigate={handleToolbarNavigate} />
        {/* Add Shift Modal */}
        <Dialog open={addModalOpen} onClose={handleCloseModal} fullWidth maxWidth="xs">
          <DialogTitle>Add Shift</DialogTitle>
          <DialogContent>
            {selectedSlot && (
              <Typography variant="subtitle2" mb={1}>
                {`${selectedSlot.start.toLocaleDateString()} ${selectedSlot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${selectedSlot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </Typography>
            )}
            <TextField
              select
              margin="dense"
              label="Job Type"
              name="jobType"
              fullWidth
              value={newShift.jobType}
              onChange={handleModalChange}
              SelectProps={{ native: false }}
            >
              {jobs.length === 0 ? (
                <MenuItem value="" disabled>No jobs found</MenuItem>
              ) : (
                jobs.map(job => (
                  <MenuItem key={job.id} value={job.jobName}>{job.jobName}</MenuItem>
                ))
              )}
            </TextField>
            <TextField
              margin="dense"
              label="Start Time"
              type="time"
              name="startTime"
              fullWidth
              value={newShift.start ? newShift.start.toTimeString().slice(0,5) : ''}
              onChange={e => setNewShift({ ...newShift, start: new Date(newShift.start.setHours(...e.target.value.split(':').map(Number))) })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              margin="dense"
              label="End Time"
              type="time"
              name="endTime"
              fullWidth
              value={newShift.end ? newShift.end.toTimeString().slice(0,5) : ''}
              onChange={e => setNewShift({ ...newShift, end: new Date(newShift.end.setHours(...e.target.value.split(':').map(Number))) })}
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleAddShift} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>
        {selectingRange && (
          <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block', textAlign: 'center' }}>{rangeMessage}</Typography>
        )}
      </Paper>

      <Typography variant="h5" mb={2}>
        📊 Dashboard Overview
      </Typography>

      <Box mb={2} display="flex" flexWrap="wrap" alignItems="center" gap={2}>
        <Select
          size="small"
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Job Types</MenuItem>
          {uniqueJobs.map((j) => (
            <MenuItem key={j} value={j}>
              {j}
            </MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          sx={{ minWidth: 200 }}
        >
          {[...Array(12).keys()].map((m) => (
            <MenuItem key={m} value={m}>
              {dayjs().month(m).format("MMMM")}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TabContext value={currentTab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <TabList onChange={(_, v) => setCurrentTab(v)} aria-label="dashboard tabs">
            <Tab label="Monthly" value="monthly" />
            <Tab label="Yearly" value="yearly" />
          </TabList>
        </Box>

        <TabPanel value="monthly">
          <Typography variant="h6" gutterBottom>
            Weekly Earnings in {dayjs().month(selectedMonth).format("MMMM")} {currentYear}
          </Typography>
          {weeklyDataForMonth.length === 0 ? (
            <Typography>No data for this month.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyDataForMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(v) => `¥${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
                <Bar
                  dataKey="total"
                  fill="#4caf50"
                  radius={[6, 6, 0, 0]}
                  onClick={(_, index) => setSelectedWeekBar(weeklyDataForMonth[index])}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Show total hours and salary for selected week bar */}
          {selectedWeekBar && (
            <Box mt={2} p={2} bgcolor={theme.palette.background.paper} borderRadius={2} boxShadow={1}>
              <Typography variant="subtitle1">
                <b>Week #{selectedWeekBar.week}</b>
              </Typography>
              <Typography>Total Salary: <b>¥{selectedWeekBar.total.toLocaleString()}</b></Typography>
              {/* Calculate total hours for this week */}
              <Typography>
                Total Hours: <b>{
                  (() => {
                    // Find the week in groupedByWeek
                    const weekData = groupedByWeek[selectedWeekBar.week];
                    return weekData ? weekData.totalHours.toFixed(2) : 'N/A';
                  })()
                } hrs</b>
              </Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setSelectedWeekBar(null)}>Clear</Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value="yearly">
          <Typography variant="h6" gutterBottom>
            Monthly Earnings in {currentYear}
          </Typography>
          {monthlyDataForYear.length === 0 ? (
            <Typography>No data for this year.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyDataForYear}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `¥${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
                <Bar
                  dataKey="total"
                  fill="#2196f3"
                  radius={[6, 6, 0, 0]}
                  onClick={(_, index) => setSelectedMonthBar(monthlyDataForYear[index])}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Show total hours and salary for selected month bar */}
          {selectedMonthBar && (
            <Box mt={2} p={2} bgcolor={theme.palette.background.paper} borderRadius={2} boxShadow={1}>
              <Typography variant="subtitle1">
                <b>Month: {selectedMonthBar.month}</b>
              </Typography>
              <Typography>Total Salary: <b>¥{selectedMonthBar.total.toLocaleString()}</b></Typography>
              {/* Calculate total hours for this month */}
              <Typography>
                Total Hours: <b>{
                  (() => {
                    // Sum all netHours for this month
                    const monthSubs = filteredSubs.filter(s => {
                      const date = new Date(s.workDate);
                      return (date.getFullYear() === currentYear && (date.getMonth() + 1) === Number(selectedMonthBar.month));
                    });
                    const total = monthSubs.reduce((acc, s) => acc + s.netHours, 0);
                    return total.toFixed(2);
                  })()
                } hrs</b>
              </Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setSelectedMonthBar(null)}>Clear</Button>
            </Box>
          )}
        </TabPanel>
      </TabContext>

      <Typography variant="h5" mt={5} mb={3}>
        Weekly Work Logs
      </Typography>

      {Object.keys(groupedByWeek).length === 0 && (
        <Typography>
          No submissions found. Go to the <Link to="/form">form page</Link> to add your work log.
        </Typography>
      )}

      {Object.entries(groupedByWeek).map(([week, data]) => {
        const remaining = data.weeklyLimit - data.totalHours;
        const isOverLimit = remaining < 0;
        return (
          <Box
            key={week}
            mb={4}
            p={2}
            border="1px solid"
            borderColor={theme.palette.divider}
            borderRadius={2}
            bgcolor={theme.palette.background.paper}
            color={theme.palette.text.primary}
          >
            <Typography variant="h6" mb={1}>
              Week #{week}
            </Typography>
            <Typography>
              Total Hours Worked: <strong>{data.totalHours.toFixed(2)}</strong> / {data.weeklyLimit} hrs
            </Typography>
            <Typography
              sx={{ color: isOverLimit ? "error.main" : "success.main", fontWeight: "bold" }}
              mb={2}
            >
              {isOverLimit
                ? `⚠️ Over limit by ${Math.abs(remaining).toFixed(2)} hours!`
                : `You have ${remaining.toFixed(2)} hours left this week.`}
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {data.submissions.map((sub) => (
                <Box
                  component="li"
                  key={sub.id}
                  sx={{
                    mb: 1.5,
                    fontSize: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ flex: "1 1 120px", fontWeight: "bold" }}>
                    {sub.jobType}
                  </Typography>
                  <Typography sx={{ flex: "1 1 120px" }}>
                    {new Date(sub.workDate).toLocaleDateString()}
                  </Typography>
                  <Typography sx={{ flex: "1 1 80px" }}>
                    {sub.netHours.toFixed(2)} hrs
                  </Typography>
                  <Link
                    to={`/results/${sub.id}`}
                    style={{ flex: "0 0 auto", color: theme.palette.primary.main }}
                  >
                    View Details
                  </Link>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => openDeleteModal(sub.id)}
                    aria-label={`Delete submission for ${sub.jobType} on ${new Date(
                      sub.workDate
                    ).toLocaleDateString()}`}
                    sx={{ ml: 1, flex: "0 0 auto" }}
                  >
                    Delete
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        );
      })}

      {modalOpen && (
        <Box
          onClick={closeModal}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            p: 2,
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              bgcolor: "background.paper",
              p: 4,
              borderRadius: 2,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
            aria-describedby="modalDesc"
          >
            <Typography id="modalDesc" fontSize={18} mb={3}>
              Are you sure you want to delete this submission?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Button
                onClick={confirmDelete}
                variant="contained"
                color="error"
                sx={{ minWidth: 110, fontSize: 18 }}
              >
                Yes, Delete
              </Button>
              <Button
                onClick={closeModal}
                variant="outlined"
                sx={{ minWidth: 110, fontSize: 18 }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)}>
        <DialogTitle>Shift Details</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <>
              <Typography><b>Job:</b> {selectedEvent.jobType}</Typography>
              <Typography><b>Date:</b> {selectedEvent.workDate}</Typography>
              <Typography><b>Time:</b> {selectedEvent.startTime} - {selectedEvent.endTime}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Close</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!selectedEvent) return;
              await deleteDoc(doc(db, `users/${user.uid}/submissions`, selectedEvent.id));
              setEventDialogOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}