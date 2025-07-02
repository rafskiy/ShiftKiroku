import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import {
  Box,
  Button,
  Stack,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from "@mui/material";

import {
  convertTimeToDecimal,
  calculateRawDuration,
  calculateNetHours,
  getBreakMinutes,
  computeWeekNumber,
} from "../utils";

export default function Form() {
  const [user, setUser] = useState(null);
  const [formState, setFormState] = useState({
    jobType: "",
    baseRate: undefined,
    workDate: null,
    startTime: null,
    endTime: null,
    breakCriteria: [],
    hasWeekendBonus: false,
  });
  const [customJobs, setCustomJobs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (!u) window.location.href = "/";
      else setUser(u);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/jobs`));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCustomJobs(data);
    });
    return unsub;
  }, [user]);

  const handleJobChange = (e) => {
    const selectedJob = customJobs.find((job) => job.id === e.target.value);
    if (selectedJob) {
      setFormState((prev) => ({
        ...prev,
        jobType: selectedJob.jobName,
        baseRate: Number(selectedJob.basePay),
        breakCriteria: selectedJob.breakCriteria || [],
        hasWeekendBonus: selectedJob.hasWeekendBonus || false,
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        jobType: "",
        baseRate: undefined,
        breakCriteria: [],
        hasWeekendBonus: false,
      }));
    }
  };

  const validateForm = () => {
    const { jobType, workDate, startTime, endTime } = formState;
    if (!jobType || !workDate || !startTime || !endTime) {
      setError("Please fill in all fields.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateForm()) return;
    setLoading(true);

    try {
      const startTimeStr = formState.startTime.format("HH:mm");
      const endTimeStr = formState.endTime.format("HH:mm");
      const workDateStr = formState.workDate.format("YYYY-MM-DD");
      const startDecimal = convertTimeToDecimal(startTimeStr);
      const endDecimal = convertTimeToDecimal(endTimeStr);
      const rawDurationUnrounded = calculateRawDuration(startDecimal, endDecimal);
      const rawDuration = Math.round(rawDurationUnrounded * 100) / 100;

      const netHours = calculateNetHours(rawDuration, formState.breakCriteria);

      const workDateObj = new Date(workDateStr);
      const isWeekend = workDateObj.getDay() === 0 || workDateObj.getDay() === 6;

      const weekendBonusAmount = isWeekend && formState.hasWeekendBonus ? netHours * 30 : 0;

      const totalEarnings = Math.round(netHours * formState.baseRate + weekendBonusAmount);
      const weekNumber = computeWeekNumber(workDateStr);

      await addDoc(collection(db, `users/${user.uid}/submissions`), {
        jobType: formState.jobType,
        baseRate: formState.baseRate,
        workDate: workDateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startDecimal,
        endDecimal,
        rawDuration,
        breaks: getBreakMinutes(rawDuration, formState.breakCriteria),
        netHours,
        weekendBonus: weekendBonusAmount,
        totalEarnings,
        weekNumber,
        createdAt: serverTimestamp(),
      });

      setSuccess("Work log submitted successfully!");
      setFormState({
        jobType: "",
        baseRate: undefined,
        workDate: null,
        startTime: null,
        endTime: null,
        breakCriteria: [],
        hasWeekendBonus: false,
      });
    } catch (err) {
      console.error(err);
      setError("Error saving data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxWidth={600}
      mx="auto"
      p={3}
      bgcolor="background.paper"
      boxShadow={3}
      borderRadius={3}
      mt={5}
      mb={5}
      fontFamily="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    >
      <Typography variant="h4" component="h1" mb={4} textAlign="center" color="primary.main">
        📝 Work Log Form
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={3}>
          <FormControl fullWidth required>
            <InputLabel id="jobType-label">Job Type</InputLabel>
            <Select
              labelId="jobType-label"
              value={customJobs.find((job) => job.jobName === formState.jobType)?.id || ""}
              label="Job Type"
              onChange={handleJobChange}
            >
              <MenuItem value="">
                <em>-- Select --</em>
              </MenuItem>
              {customJobs.length > 0 ? (
                customJobs.map((job) => (
                  <MenuItem key={job.id} value={job.id}>
                    {job.jobName} (¥{job.basePay})
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No jobs available. Add one in Manage Jobs.</MenuItem>
              )}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Work Date"
              value={formState.workDate}
              onChange={(newValue) => setFormState((prev) => ({ ...prev, workDate: newValue }))}
              renderInput={(params) => <TextField {...params} fullWidth required />}
            />
            <TimePicker
              label="Start Time"
              value={formState.startTime}
              onChange={(newValue) => setFormState((prev) => ({ ...prev, startTime: newValue }))}
              minutesStep={10}
              ampm={false}
              renderInput={(params) => <TextField {...params} fullWidth required sx={{ mt: 2 }} />}
            />
            <TimePicker
              label="End Time"
              value={formState.endTime}
              onChange={(newValue) => setFormState((prev) => ({ ...prev, endTime: newValue }))}
              minutesStep={10}
              ampm={false}
              renderInput={(params) => <TextField {...params} fullWidth required sx={{ mt: 2 }} />}
            />
          </LocalizationProvider>

          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() =>
                setFormState({
                  jobType: "",
                  baseRate: undefined,
                  workDate: null,
                  startTime: null,
                  endTime: null,
                  breakCriteria: [],
                  hasWeekendBonus: false,
                })
              }
              disabled={loading}
            >
              Clear
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Submit
            </Button>
          </Stack>
        </Stack>
      </form>
    </Box>
  );
}
