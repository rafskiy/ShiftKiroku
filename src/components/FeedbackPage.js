import React, { useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });
    setLoading(true);

    try {
      const response = await fetch(
        "https://asia-northeast1-shift-kiroku.cloudfunctions.net/sendFeedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unknown error");

      setStatus({ type: "success", text: result.success });
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={500} mx="auto" mt={5} p={4} boxShadow={3} borderRadius={2}>
      <Typography variant="h4" mb={3} textAlign="center" color="primary.main">
        Feedback
      </Typography>

      {status.text && (
        <Alert severity={status.type} sx={{ mb: 2 }}>
          {status.text}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Your Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Your Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            multiline
            rows={4}
            fullWidth
          />
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            Send Feedback
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
