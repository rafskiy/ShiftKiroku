import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function CustomJobForm() {
  const [jobName, setJobName] = useState("");
  const [basePay, setBasePay] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!jobName.trim() || !basePay || isNaN(basePay) || Number(basePay) <= 0) {
      setError("Please enter a valid job name and base pay (> 0).");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, `users/${auth.currentUser.uid}/jobs`), {
        jobName: jobName.trim(),
        basePay: Number(basePay),
      });

      setJobName("");
      setBasePay("");
      setSuccessMsg("Custom job added successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to add custom job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h3>Add Custom Job</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Job Name:
          <input
            type="text"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            required
          />
        </label>
        <br />
        <label>
          Base Pay (per hour):
          <input
            type="number"
            value={basePay}
            onChange={(e) => setBasePay(e.target.value)}
            min="0"
            step="0.01"
            required
          />
        </label>
        <br />
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Job"}
        </button>
      </form>
    </div>
  );
}
