import React, { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const handleSignup = async () => {
    clearMessages();
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("Registration successful! You can now log in.");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful! Redirecting...");
      navigate("/form");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    clearMessages();
    if (!email) {
      setError("Please enter your email to reset your password.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Box
      maxWidth={400}
      mx="auto"
      mt={5}
      p={4}
      boxShadow={3}
      borderRadius={2}
      bgcolor="background.paper"
      fontFamily="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    >
      <Box display="flex" justifyContent="center" mb={1}>
        <img
          src="/shiftkiroku-logo.png" // Make sure the image is in your public folder
          alt="ShiftKiroku Logo"
          style={{
            height: 60, // adjust size if needed
            objectFit: "contain",
          }}
        />
      </Box>
      <Typography
        variant="subtitle1"
        textAlign="center"
        mb={3}
        color="text.secondary"
      >
        Log in or register to track your shifts effortlessly
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Stack spacing={2} mb={3}>
        <TextField
          label="Email Address"
          variant="outlined"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          autoComplete="email"
        />
        <TextField
          label="Password"
          variant="outlined"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          autoComplete="current-password"
        />
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSignup}
          disabled={loading}
          fullWidth
          startIcon={loading && <CircularProgress size={20} />}
        >
          Register
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleLogin}
          disabled={loading}
          fullWidth
          startIcon={loading && <CircularProgress size={20} />}
        >
          Login
        </Button>
      </Stack>

      <Button
        variant="outlined"
        color="warning"
        onClick={handleResetPassword}
        disabled={loading}
        fullWidth
      >
        Forgot Password?
      </Button>
    </Box>
  );
}
