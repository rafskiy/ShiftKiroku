import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
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
  Tooltip,
} from "recharts";
import {
  Box,
  Tab,
  Typography,
  MenuItem,
  Select,
  Button,
  useTheme,
} from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import dayjs from "dayjs";

function isBreakPeriod(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const winterStart = new Date(year - 1, 11, 20);
  const winterEnd = new Date(year, 0, 10);
  const springStart = new Date(year, 1, 1);
  const springEnd = new Date(year, 2, 31);
  return (
    (date >= winterStart && date <= winterEnd) ||
    (date >= springStart && date <= springEnd)
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
  });

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
                <Bar dataKey="total" fill="#4caf50" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                <Bar dataKey="total" fill="#2196f3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
    </Box>
  );
}
