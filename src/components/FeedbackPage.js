import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, MenuItem, FormControl, InputLabel, Select, Checkbox, FormControlLabel } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FEEDBACK_TYPES = [
  'Bug Report',
  'Feature Request',
  'General Suggestion',
  'Question',
  'Other',
];

export default function FeedbackPage() {
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [wantResponse, setWantResponse] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!type) {
      setError('Please select a feedback type.');
      return;
    }
    if (!message.trim()) {
      setError('Feedback message is required.');
      return;
    }
    if (wantResponse && !email.trim()) {
      setError('Email is required if you want a response.');
      return;
    }
    try {
      await addDoc(collection(db, 'feedback'), {
        type,
        message: message.trim(),
        wantResponse,
        email: wantResponse ? email.trim() : null,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setType('');
      setMessage('');
      setWantResponse(false);
      setEmail('');
    } catch (err) {
      setError('Failed to send feedback. Please try again.');
    }
  };

  if (submitted) {
    return (
      <Box maxWidth={500} mx="auto" mt={6}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>Thank you for your feedback!</Typography>
          <Button variant="contained" onClick={() => setSubmitted(false)}>Send Another</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box maxWidth={500} mx="auto" mt={6}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 4 }}>
        <Typography variant="h4" align="center" color="primary" fontWeight={700} mb={3}>
          Feedback
        </Typography>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth required margin="normal">
            <InputLabel id="feedback-type-label">Type *</InputLabel>
            <Select
              labelId="feedback-type-label"
              value={type}
              label="Type *"
              onChange={e => setType(e.target.value)}
            >
              <MenuItem value=""><em>Select type...</em></MenuItem>
              {FEEDBACK_TYPES.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Your Feedback *"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            fullWidth
            multiline
            minRows={4}
            margin="normal"
          />
          <FormControlLabel
            control={<Checkbox checked={wantResponse} onChange={e => setWantResponse(e.target.checked)} />}
            label="I want a response"
            sx={{ mt: 1 }}
          />
          {wantResponse && (
            <TextField
              label="Email (required for response)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required={wantResponse}
              fullWidth
              margin="normal"
              type="email"
            />
          )}
          {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 3, width: '100%', fontWeight: 600, fontSize: 18 }}>
            Submit
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
