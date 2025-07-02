import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setAuthChecked(true);
      if (!u) navigate("/");
      else setUser(u);
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (!authChecked || !user) return;

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const docRef = doc(db, "users", user.uid, "submissions", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          setError("Submission not found.");
        }
      } catch (e) {
        console.error(e);
        setError("Error fetching data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user, authChecked]);

  if (!authChecked) return <p>Checking authentication...</p>;
  if (loading) return <p>Loading submission data...</p>;

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
        <div style={{
          backgroundColor: "#ffebee",
          padding: 20,
          borderRadius: 8,
          textAlign: "center",
        }}>
          <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              marginTop: 15,
              padding: "10px 20px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <div style={{
        backgroundColor: "#f9fafc",
        borderRadius: 12,
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        padding: 30,
      }}>
        <h2 style={{
          fontSize: 28,
          marginBottom: 25,
          color: "#333",
          textAlign: "center",
        }}>
          📄 Submission Details
        </h2>

        <Detail label="Job Type" value={data.jobType} />
        <Detail label="Work Date" value={new Date(data.workDate).toLocaleDateString()} />
        <Detail label="Start Time" value={data.startTime} />
        <Detail label="End Time" value={data.endTime} />
        <Detail
          label="Raw Duration"
          value={
            typeof data.rawDuration === "number"
              ? `${data.rawDuration.toFixed(2)} hours`
              : "-"
          }
        />
        <Detail
          label="Break Time"
          value={
            typeof data.breaks === "number"
              ? `${data.breaks} minutes`
              : "-"
          }
        />
        <Detail
          label="Net Working Hours"
          value={
            typeof data.netHours === "number"
              ? `${data.netHours.toFixed(2)} hours`
              : "-"
          }
          highlight
        />
        <Detail
          label="Base Rate"
          value={data.baseRate ? `¥${data.baseRate}` : "-"}
        />

        <Detail
          label="Weekend Bonus"
          value={
            typeof data.weekendBonus === "number" && data.weekendBonus > 0
              ? `+¥${data.weekendBonus.toFixed(0)}`
              : "No bonus applied"
          }
        />

        <Detail
          label="Total Earnings"
          value={
            typeof data.totalEarnings === "number"
              ? `¥${data.totalEarnings.toFixed(0)}`
              : "-"
          }
          highlight
        />

        {data.weekendBonus > 0 && (
          <p style={{
            fontSize: 16,
            marginTop: 10,
            color: "#0c8346",
            textAlign: "center",
          }}>
            🎉 A weekend bonus was applied for this shift!
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: 30 }}>
          <Link
            to="/dashboard"
            style={{
              display: "inline-block",
              backgroundColor: "#007bff",
              color: "white",
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 500,
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0056b3")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#007bff")}
          >
            ⬅ Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, highlight = false }) {
  return (
    <p style={{
      fontSize: 18,
      marginBottom: 15,
      color: highlight ? "#0c8346" : "#333",
      fontWeight: highlight ? "bold" : "normal",
    }}>
      <strong>{label}:</strong> {value}
    </p>
  );
}
