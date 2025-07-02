import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

import { useNavigate } from "react-router-dom";

import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

export default function ManageJobs() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [jobName, setJobName] = useState("");
  const [basePay, setBasePay] = useState("");
  const [jobs, setJobs] = useState([]);
  const [hasBreakCriteria, setHasBreakCriteria] = useState(false);
  const [breakCriteria, setBreakCriteria] = useState([]);
  const [hasWeekendBonus, setHasWeekendBonus] = useState(false);
  const [weekendBonus, setWeekendBonus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingJobId, setEditingJobId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/");
      else setUser(u);
    });
    return unsubAuth;
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/jobs`));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    });
    return unsub;
  }, [user]);

  const resetForm = () => {
    setJobName("");
    setBasePay("");
    setHasBreakCriteria(false);
    setBreakCriteria([]);
    setHasWeekendBonus(false);
    setWeekendBonus("");
    setEditingJobId(null);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!jobName.trim() || basePay === "") {
      setError("Please fill in both job name and base pay.");
      return;
    }

    if (hasWeekendBonus && (weekendBonus === "" || Number(weekendBonus) < 0)) {
      setError("Please enter a valid weekend bonus amount.");
      return;
    }

    setLoading(true);
    try {
      if (editingJobId) {
        const jobRef = doc(db, `users/${user.uid}/jobs`, editingJobId);
        await updateDoc(jobRef, {
          jobName: jobName.trim(),
          basePay: Number(basePay),
          hasBreakCriteria,
          breakCriteria: hasBreakCriteria ? breakCriteria : [],
          hasWeekendBonus,
          weekendBonus: hasWeekendBonus ? Number(weekendBonus) : 0,
        });
        setSuccess("Job updated successfully!");
      } else {
        await addDoc(collection(db, `users/${user.uid}/jobs`), {
          jobName: jobName.trim(),
          basePay: Number(basePay),
          hasBreakCriteria,
          breakCriteria: hasBreakCriteria ? breakCriteria : [],
          hasWeekendBonus,
          weekendBonus: hasWeekendBonus ? Number(weekendBonus) : 0,
          createdAt: new Date(),
        });
        setSuccess("Job added successfully!");
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError("Failed to save job.");
    } finally {
      setLoading(false);
    }
  };

  const addBreakRule = () => {
    setBreakCriteria([...breakCriteria, { hours: 0, breakMinutes: 0 }]);
  };

  const removeBreakRule = (index) => {
    setBreakCriteria(breakCriteria.filter((_, idx) => idx !== index));
  };

  const updateBreakRule = (index, field, value) => {
    const updated = [...breakCriteria];
    updated[index][field] = value;
    setBreakCriteria(updated);
  };

  const deleteJob = async (jobId) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await deleteDoc(doc(db, `users/${user.uid}/jobs`, jobId));
      setSuccess("Job deleted.");
      if (editingJobId === jobId) resetForm();
    } catch (err) {
      console.error(err);
      setError("Failed to delete job.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (job) => {
    setJobName(job.jobName);
    setBasePay(job.basePay.toString());
    setHasBreakCriteria(job.hasBreakCriteria || false);
    setBreakCriteria(job.breakCriteria || []);
    setHasWeekendBonus(job.hasWeekendBonus || false);
    setWeekendBonus(job.weekendBonus?.toString() || "");
    setEditingJobId(job.id);
    setError("");
    setSuccess("");
  };

  if (!user)
    return (
      <Typography variant="body1" align="center" mt={4}>
        Loading Manage Jobs...
      </Typography>
    );

  return (
    <Box
      maxWidth={800}
      margin="auto"
      padding={3}
      bgcolor={theme.palette.mode === "dark" ? "#121212" : "#fafafa"}
      color={theme.palette.text.primary}
      minHeight="100vh"
    >
      <Typography variant="h4" gutterBottom>
        🛠️ Manage Jobs
      </Typography>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color="success.main" mb={2}>
          {success}
        </Typography>
      )}

      <Box component="form" onSubmit={handleSubmit} mb={5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          mb={2}
          flexWrap="wrap"
        >
          <TextField
            label="Job Name"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            required
            sx={{ flex: 1, minWidth: 200 }}
            disabled={loading}
          />
          <TextField
            label="Base Pay (¥/hr)"
            type="number"
            value={basePay}
            onChange={(e) => setBasePay(e.target.value)}
            required
            inputProps={{ min: 0 }}
            sx={{ flex: 1, minWidth: 200 }}
            disabled={loading}
          />
        </Stack>

        <FormControlLabel
          control={
            <Checkbox
              checked={hasBreakCriteria}
              onChange={(e) => setHasBreakCriteria(e.target.checked)}
              disabled={loading}
            />
          }
          label="Enable Break Criteria"
        />

        {hasBreakCriteria && (
          <Box
            sx={{
              border: "1px solid",
              borderColor: theme.palette.divider,
              borderRadius: 1,
              p: 2,
              mt: 1,
              mb: 3,
              backgroundColor:
                theme.palette.mode === "dark" ? "#1e1e1e" : "#f9f9f9",
            }}
          >
            <Typography variant="h6" mb={2}>
              Break Rules
            </Typography>

            {breakCriteria.map((rule, idx) => (
              <Stack
                key={idx}
                direction="row"
                alignItems="center"
                spacing={1}
                mb={1}
              >
                <TextField
                  label="Work Hours ≥"
                  type="number"
                  value={rule.hours}
                  onChange={(e) =>
                    updateBreakRule(idx, "hours", Number(e.target.value))
                  }
                  fullWidth
                  required
                  disabled={loading}
                  inputProps={{ min: 0 }}
                />
                <Typography variant="h5">→</Typography>
                <TextField
                  label="Break Minutes"
                  type="number"
                  value={rule.breakMinutes}
                  onChange={(e) =>
                    updateBreakRule(idx, "breakMinutes", Number(e.target.value))
                  }
                  fullWidth
                  required
                  disabled={loading}
                  inputProps={{ min: 0 }}
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => removeBreakRule(idx)}
                  disabled={loading}
                  aria-label={`Remove break rule ${idx + 1}`}
                  sx={{ minWidth: 40, px: 1, py: 0.5 }}
                >
                  ✕
                </Button>
              </Stack>
            ))}

            <Button
              variant="contained"
              color="primary"
              onClick={addBreakRule}
              disabled={loading}
            >
              + Add Break Rule
            </Button>
          </Box>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={hasWeekendBonus}
              onChange={(e) => setHasWeekendBonus(e.target.checked)}
              disabled={loading}
            />
          }
          label="Enable Weekend Bonus"
        />

        {hasWeekendBonus && (
          <TextField
            label="Weekend Bonus (¥/hr)"
            type="number"
            value={weekendBonus}
            onChange={(e) => setWeekendBonus(e.target.value)}
            inputProps={{ min: 0 }}
            required={hasWeekendBonus}
            sx={{ mt: 1, width: 200 }}
            disabled={loading}
          />
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          disabled={loading}
        >
          {editingJobId ? "Update Job" : "Add Job"}
        </Button>

        {editingJobId && (
          <Button
            type="button"
            onClick={resetForm}
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ mt: 1 }}
            disabled={loading}
          >
            Cancel Editing
          </Button>
        )}
      </Box>

      <Typography variant="h5" gutterBottom>
        Existing Jobs
      </Typography>

      {jobs.length === 0 ? (
        <Typography>No jobs added yet. Use the form above to add one.</Typography>
      ) : (
        <Stack spacing={2}>
          {jobs.map((job) => (
            <Box
              key={job.id}
              p={2}
              border={`1px solid ${theme.palette.divider}`}
              borderRadius={2}
              bgcolor={theme.palette.mode === "dark" ? "#1e1e1e" : "#fff"}
              color={theme.palette.text.primary}
            >
              <Typography
                variant="h6"
                sx={{ wordWrap: "break-word" }}
                gutterBottom
              >
                {job.jobName} – ¥{job.basePay}/hr
              </Typography>

              {job.hasBreakCriteria &&
                job.breakCriteria &&
                job.breakCriteria.length > 0 && (
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: "break-word",
                      overflowX: "auto",
                      maxWidth: "100%",
                      maxHeight: 100,
                      pr: 1,
                    }}
                    gutterBottom
                  >
                    Break Rules:{" "}
                    {job.breakCriteria
                      .map((r) => `${r.hours}h ≥ ${r.breakMinutes}m`)
                      .join(", ")}
                  </Typography>
                )}

              {job.hasWeekendBonus && (
                <Typography variant="body2" gutterBottom>
                  Weekend Bonus: ¥{job.weekendBonus}/hr
                </Typography>
              )}

              <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => startEditing(job)}
                  aria-label={`Edit job ${job.jobName}`}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => deleteJob(job.id)}
                  aria-label={`Delete job ${job.jobName}`}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
