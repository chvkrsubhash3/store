import 'express-async-errors';
import express, { Request, Response } from 'express';
import next from 'next';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';

import config from './src/server/config/env';
import { connectDB } from './src/server/config/db';
import { requestLogger, setWss } from './src/server/middleware/logger';
import { apiLimiter } from './src/server/middleware/rateLimiter';

// Routes
import authRoutes from './src/server/routes/auth';
import productRoutes from './src/server/routes/products';
import cartRoutes from './src/server/routes/cart';
import orderRoutes from './src/server/routes/orders';
import socRoutes from './src/server/routes/soc';
import adminRoutes from './src/server/routes/admin';
import categoryRoutes from './src/server/routes/categories';
import userRoutes from './src/server/routes/users';

const dev = config.env !== 'production';
const nextApp = next({ dev, dir: process.cwd() });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  const app = express();
  const server = http.createServer(app);

  // Dedicated SOC WebSocket Server (noServer mode allows Next.js HMR _next/webpack-hmr to pass through)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws/soc') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`🔌 SOC WebSocket connected from ${clientIp}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'SecureMart SOC Live Feed' }));
    }
  });

  setWss(wss);

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const uploadDir = path.resolve(config.uploadDir);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));

  // Request Logger (SOC - logs everything)
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'SecureMart Platform (Unified Server)',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', apiLimiter, productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/users', apiLimiter, userRoutes);
  app.use('/api', apiLimiter, cartRoutes);
  app.use('/api/orders', apiLimiter, orderRoutes);
  app.use('/api/soc', socRoutes);
  app.use('/api/admin', adminRoutes);

  // Delegate all remaining requests to Next.js Frontend
  app.all('*', (req: Request, res: Response) => {
    return handle(req, res);
  });

  await connectDB();

  server.listen(config.port, () => {
    console.log(`\n============================================================`);
    console.log(`🚀 SecureMart Unified Full-Stack Platform`);
    console.log(`🌐 Application URL: http://localhost:${config.port}`);
    console.log(`🔌 SOC WebSocket:   ws://localhost:${config.port}/ws/soc`);
    console.log(`📊 SOC Dashboard:   http://localhost:${config.port}/soc`);
    console.log(`🛡️  Admin Portal:    http://localhost:${config.port}/admin`);
    console.log(`============================================================\n`);
  });
});
