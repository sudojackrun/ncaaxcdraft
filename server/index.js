import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import athleteRoutes from './routes/athletes.js';
import teamRoutes from './routes/teams.js';
import draftRoutes from './routes/draft.js';
import meetRoutes from './routes/meets.js';
import importRoutes from './routes/import-improved.js';
import debugRoutes from './routes/debug.js';
import rankingsRoutes from './routes/rankings.js';
import liveRaceRoutes from './routes/live-race.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Heroku
app.set('trust proxy', 1);

// Rate limiting - 1000 requests per 15 minutes (increased for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for localhost during development
    return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', limiter); // Apply rate limiting to all API routes

// Routes
app.use('/api/athletes', athleteRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/meets', meetRoutes);
app.use('/api/import', importRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/live-race', liveRaceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Create HTTP server for WebSocket
const server = createServer(app);

// WebSocket for live draft updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('message', (message) => {
    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🏃 Cross Country Draft API running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
});

export { wss };
