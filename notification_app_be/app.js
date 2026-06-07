require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In-memory store for credentials
let clientID = null;
let clientSecret = null;
let accessToken = null;

// Basic logger
const log = (level, message) => {
  console.log(`[${level.toUpperCase()}] ${message}`);
};

// --- API Endpoints ---

// 1. Register with the evaluation service
app.post('/api/register', async (req, res) => {
  try {
    const response = await axios.post('http://4.224.186.213/evaluation-service/register', req.body);
    clientID = response.data.clientID;
    clientSecret = response.data.clientSecret;
    log('info', 'Registration successful.');
    res.status(200).json(response.data);
  } catch (error) {
    log('error', `Registration failed: ${error.message}`);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 2. Authenticate to get a token
app.post('/api/authenticate', async (req, res) => {
  if (!clientID || !clientSecret) {
    return res.status(400).json({ message: 'Please register first.' });
  }
  try {
    const response = await axios.post('http://4.224.186.213/evaluation-service/auth', { clientID, clientSecret });
    accessToken = response.data.access_token;
    log('info', 'Authentication successful.');
    res.status(200).json(response.data);
  } catch (error) {
    log('error', `Authentication failed: ${error.message}`);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// 3. Send logs
app.post('/api/logs', async (req, res) => {
  if (!accessToken) {
    return res.status(401).json({ message: 'Please authenticate first.' });
  }
  try {
    const response = await axios.post('http://4.224.186.213/evaluation-service/logs', req.body, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    log('info', 'Log sent successfully.');
    res.status(200).json(response.data);
  } catch (error) {
    log('error', `Failed to send log: ${error.message}`);
    res.status(500).json({ message: 'Failed to send log' });
  }
});

// 4. Mock endpoint for notifications
app.get('/api/notifications', (req, res) => {
  log('info', 'GET /api/notifications called');
  res.status(200).json([
    { id: 1, message: 'Welcome to the notification system.' }
  ]);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
