import dotenv from 'dotenv';
import { Redis } from 'ioredis';
import { GameInstance, PlayerInfo } from './engine/GameInstance.js';
import { CardHighLowState } from '@afterparty/shared-types';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

console.log(`[CardHighLow Microservice] Starting on Node.js ${process.version}...`);

const games = new Map<string, GameInstance>();

// Initialize Redis if enabled
let subClient: Redis | null = null;
let pubClient: Redis | null = null;

async function setupRedis() {
  try {
    subClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    pubClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });

    await subClient.connect();
    await pubClient.connect();

    console.log(`[CardHighLow Microservice] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

    // Subscribe to game action events from Gateway
    await subClient.subscribe('game:highlow:actions');

    subClient.on('message', async (channel, message) => {
      if (channel === 'game:highlow:actions') {
        try {
          const data = JSON.parse(message);
          handleGameAction(data);
        } catch (err) {
          console.error('[CardHighLow] Error handling action message:', err);
        }
      }
    });
  } catch (err: any) {
    console.warn(`[CardHighLow Microservice] Redis not available: ${err.message}. Running in standalone mode.`);
  }
}

export function handleGameAction(event: {
  action: 'start' | 'select_target' | 'make_guess' | 'rematch';
  roomId: string;
  playerId?: string;
  players?: PlayerInfo[];
  cardIndex?: number;
  guess?: 'high' | 'low';
}) {
  const { action, roomId, playerId } = event;
  let game = games.get(roomId);

  if (action === 'start') {
    game = new GameInstance(roomId);
    games.set(roomId, game);
    const newState = game.startNewGame(event.players || []);
    broadcastGameState(roomId, newState, { type: 'deal' });
    return;
  }

  if (!game) {
    console.warn(`[CardHighLow] Game not found for room ${roomId}`);
    return;
  }

  if (action === 'select_target') {
    try {
      const newState = game.selectTarget(playerId!, event.cardIndex!);
      broadcastGameState(roomId, newState);
    } catch (err: any) {
      console.error(`[CardHighLow] Select target error: ${err.message}`);
    }
  } else if (action === 'make_guess') {
    try {
      const { state, actionResult } = game.makeGuess(playerId!, event.guess!);
      const animType = actionResult.outcome === 'bonus_turn' 
        ? 'bonus_turn' 
        : (actionResult.drinksPenalty > 0 ? 'drink_penalty' : 'reveal');
      
      broadcastGameState(roomId, state, { type: animType, data: actionResult });
    } catch (err: any) {
      console.error(`[CardHighLow] Make guess error: ${err.message}`);
    }
  } else if (action === 'rematch') {
    try {
      const currentPlayers = Object.values(game.getState().stats).map(s => ({
        id: s.userId,
        nickname: s.nickname,
        avatarUrl: s.avatarUrl,
      }));
      const newState = game.startNewGame(currentPlayers);
      broadcastGameState(roomId, newState, { type: 'shuffle' });
    } catch (err: any) {
      console.error(`[CardHighLow] Rematch error: ${err.message}`);
    }
  }
}

function broadcastGameState(roomId: string, state: CardHighLowState, anim?: { type: string; data?: any }) {
  if (pubClient && pubClient.status === 'ready') {
    pubClient.publish(`room:broadcast:${roomId}`, JSON.stringify({
      type: 'game:state',
      payload: { gameState: state },
    }));

    if (anim) {
      pubClient.publish(`room:broadcast:${roomId}`, JSON.stringify({
        type: 'game:animation',
        payload: { animation: anim.type, data: anim.data },
      }));
    }
  }
}

setupRedis();
