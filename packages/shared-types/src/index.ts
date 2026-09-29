/**
 * @afterparty/shared-types
 * Shared types, schemas, and protocol definitions for AfterParty.
 */

export type Platform = 'weixin' | 'guest';

export interface User {
  id: string;             // openid or guest uuid
  platform: Platform;
  nickname: string;
  avatarUrl: string;
  isGuest: boolean;
}

export type RoomStatus = 'waiting' | 'playing' | 'ended';

export interface Seat {
  seatIndex: number;
  user: User | null;
  isReady: boolean;
}

export interface Room {
  roomId: string;
  roomCode: string;       // 6-digit numeric string
  hostId: string;
  gameType: string;       // 'card_highlow'
  seatCount: number;      // default 6, min 2, max 12
  seats: Seat[];
  status: RoomStatus;
  createdAt: number;
}

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  id: string;             // unique identifier e.g. 'hearts_1'
  suit: CardSuit;
  rank: number;           // 1=A, 2..10, 11=J, 12=Q, 13=K
}

export type GuessType = 'high' | 'low';

export type GuessOutcome = 'correct' | 'wrong' | 'tie' | 'bonus_turn';

export interface ActionResult {
  playerId: string;
  targetCard: Card;
  drawnCard: Card;
  guess: GuessType;
  outcome: GuessOutcome;
  drinksPenalty: number;
  message: string;
  isBoundary: boolean;    // true if drawnCard is A(1) or K(13)
}

export interface PlayerStats {
  userId: string;
  nickname: string;
  avatarUrl: string;
  drinksCount: number;
  correctGuesses: number;
  consecutiveWins: number;
  maxConsecutiveWins: number;
}

export type HighLowGamePhase = 
  | 'shuffling'
  | 'dealing_public'
  | 'selecting_target'
  | 'guessing'
  | 'revealing'
  | 'game_over';

export interface CardHighLowState {
  roomId: string;
  phase: HighLowGamePhase;
  deckRemainingCount: number;       // total remaining in draw pile (starts at 46)
  publicCards: (Card | null)[];     // 6 slots
  activeTargetIndex: number | null; // 0..5 chosen by current player
  drawnCard: Card | null;           // face-down or revealed
  drawnCardRevealed: boolean;
  currentTurnPlayerId: string;
  turnPlayerOrder: string[];        // list of seated player IDs in turn cycle
  currentTurnIndex: number;
  lastResult: ActionResult | null;
  stats: Record<string, PlayerStats>;
  totalDrinksInGame: number;
  mvpDrinkerId: string | null;
}

// ================= WebSocket Protocol Definitions =================

export type ClientAction =
  | { type: 'auth'; payload: { token: string; user?: Partial<User> } }
  | { type: 'room:join'; payload: { roomCode: string } }
  | { type: 'room:leave'; payload?: Record<string, never> }
  | { type: 'room:take_seat'; payload: { seatIndex: number } }
  | { type: 'room:leave_seat'; payload?: Record<string, never> }
  | { type: 'room:update_seat_count'; payload: { seatCount: number } }
  | { type: 'room:kick_player'; payload: { targetUserId: string } }
  | { type: 'room:start_game'; payload?: Record<string, never> }
  // High-Low specific actions
  | { type: 'game:highlow:select_target'; payload: { cardIndex: number } }
  | { type: 'game:highlow:make_guess'; payload: { guess: GuessType } }
  | { type: 'game:highlow:rematch'; payload?: Record<string, never> };

export type ServerEvent =
  | { type: 'auth:success'; payload: { user: User; token: string } }
  | { type: 'room:state'; payload: { room: Room } }
  | { type: 'room:error'; payload: { code: string; message: string } }
  | { type: 'game:state'; payload: { gameState: CardHighLowState } }
  | { type: 'game:animation'; payload: { animation: 'shuffle' | 'deal' | 'reveal' | 'replace' | 'drink_penalty' | 'bonus_turn'; data?: any } }
  | { type: 'game:toast'; payload: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' } }
  | { type: 'pong'; payload?: { timestamp: number } };
