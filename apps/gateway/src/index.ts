import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { Redis } from 'ioredis';
import { initDatabase } from './db/index.js';
import { RoomManager } from './modules/room/RoomManager.js';
import { AuthService } from './modules/auth/AuthService.js';
import { WebSocketHub } from './ws/WebSocketHub.js';

import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function main() {
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Serve static H5 client if built
  const candidatePaths = [
    path.resolve(__dirname, '../../client/dist/build/h5'),
    path.resolve(__dirname, '../../../apps/client/dist/build/h5'),
    path.resolve(process.cwd(), 'apps/client/dist/build/h5'),
    path.resolve(process.cwd(), 'dist/build/h5'),
    path.resolve('/app/apps/client/dist/build/h5'),
  ];
  const h5Path = candidatePaths.find(p => fs.existsSync(p));
  if (h5Path) {
    server.log.info(`[Gateway] Serving H5 client from ${h5Path}`);
    await server.register(fastifyStatic, {
      root: h5Path,
      prefix: '/',
    });
  } else {
    server.log.warn('[Gateway] No H5 client build found in candidate paths');
  }

  // Initialize DB
  await initDatabase();

  // Initialize Redis
  let pubRedis: Redis | null = null;
  let subRedis: Redis | null = null;
  try {
    pubRedis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    subRedis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    await pubRedis.connect();
    await subRedis.connect();
    server.log.info(`[Gateway] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  } catch (err: any) {
    server.log.warn(`[Gateway] Redis connection error: ${err.message}. Running in memory fallback.`);
    pubRedis = null;
    subRedis = null;
  }

  const roomManager = new RoomManager(pubRedis);
  const wsHub = new WebSocketHub(roomManager, pubRedis, subRedis);
  wsHub.register(server);

  // REST API Routes
  server.get('/health', async () => {
    return {
      status: 'ok',
      service: 'afterparty-gateway',
      timestamp: Date.now(),
    };
  });

  // Guest Auth
  server.post('/api/auth/guest', async (req) => {
    const body = (req.body as any) || {};
    return await AuthService.createGuestUser(body.nickname, body.avatarUrl);
  });

  // WeChat Auth
  server.post('/api/auth/wechat', async (req) => {
    const body = (req.body as any) || {};
    return await AuthService.wechatLogin(body.code, body.nickname, body.avatarUrl);
  });

  // Create Room
  server.post('/api/room/create', async (req, reply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const userPayload = token ? AuthService.verifyToken(token) : null;
    if (!userPayload) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = (req.body as any) || {};
    const hostUser = body.user || {
      id: userPayload.userId,
      nickname: '房主',
      avatarUrl: '',
      platform: 'guest',
      isGuest: true,
    };

    const room = roomManager.createRoom(hostUser, body.gameType || 'card_highlow', body.seatCount || 6);
    return { room };
  });

  // Check Room Info
  server.get('/api/room/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const room = roomManager.getRoomByCode(code);
    if (!room) {
      return reply.code(404).send({ error: '房间不存在' });
    }
    return { room };
  });

  // Dice Game Telemetry & Stats API
  let localDiceRolls = 0;
  let localDiceSessions = 0;

  server.post('/api/stats/dice', async (req) => {
    const body = (req.body as any) || {};
    const { action = 'roll', count = 1, userId } = body;

    if (pubRedis && pubRedis.status === 'ready') {
      try {
        if (action === 'roll') {
          await pubRedis.incrby('afterparty:stats:dice:rolls', count);
        } else if (action === 'session') {
          await pubRedis.incr('afterparty:stats:dice:sessions');
        }
        if (userId) {
          await pubRedis.sadd('afterparty:stats:dice:users', userId);
        }
      } catch (e) {
        // fallback to in-memory counter
      }
    }

    if (action === 'roll') localDiceRolls += count;
    else if (action === 'session') localDiceSessions += 1;

    return { ok: true, timestamp: Date.now() };
  });

  server.get('/api/stats/dice', async () => {
    let rolls = localDiceRolls;
    let sessions = localDiceSessions;
    let users = 0;
    if (pubRedis && pubRedis.status === 'ready') {
      try {
        const [r, s, u] = await Promise.all([
          pubRedis.get('afterparty:stats:dice:rolls'),
          pubRedis.get('afterparty:stats:dice:sessions'),
          pubRedis.scard('afterparty:stats:dice:users'),
        ]);
        if (r) rolls = parseInt(r, 10);
        if (s) sessions = parseInt(s, 10);
        users = u || 0;
      } catch (e) {
        // fallback to in-memory
      }
    }
    return { rolls, sessions, users, timestamp: Date.now() };
  });

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[AfterParty Gateway] Listening on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
