import { describe, it, expect } from 'vitest';
import { Deck } from '../src/engine/Deck.js';
import { GameInstance, PlayerInfo } from '../src/engine/GameInstance.js';

describe('Deck Engine Tests', () => {
  it('should initialize exactly 52 unique cards without jokers', () => {
    const deck = new Deck();
    expect(deck.remainingCount).toBe(52);

    const cards = deck.getRemainingCards();
    const ids = new Set(cards.map(c => c.id));
    expect(ids.size).toBe(52);

    const ranks = cards.map(c => c.rank);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(13);
  });

  it('should correctly draw cards and decrement count', () => {
    const deck = new Deck();
    const drawn6 = deck.draw(6);
    expect(drawn6.length).toBe(6);
    expect(deck.remainingCount).toBe(46);

    const drawn1 = deck.drawOne();
    expect(drawn1).not.toBeNull();
    expect(deck.remainingCount).toBe(45);
  });
});

describe('Card High-Low Game Rules', () => {
  const players: PlayerInfo[] = [
    { id: 'player_1', nickname: 'Alice', avatarUrl: 'avatar1.png' },
    { id: 'player_2', nickname: 'Bob', avatarUrl: 'avatar2.png' },
  ];

  it('should initialize room with 6 public cards and 46 draw pile', () => {
    const game = new GameInstance('room_1001');
    const state = game.startNewGame(players);

    expect(state.phase).toBe('selecting_target');
    expect(state.publicCards.length).toBe(6);
    expect(state.publicCards.every(c => c !== null)).toBe(true);
    expect(state.deckRemainingCount).toBe(46);
    expect(state.turnPlayerOrder).toEqual(['player_1', 'player_2']);
    expect(['player_1', 'player_2']).toContain(state.currentTurnPlayerId);
  });

  it('should transition to guessing phase after selecting target card', () => {
    const game = new GameInstance('room_1001');
    const state = game.startNewGame(players);
    const turnPlayer = state.currentTurnPlayerId;

    const nextState = game.selectTarget(turnPlayer, 2);
    expect(nextState.phase).toBe('guessing');
    expect(nextState.activeTargetIndex).toBe(2);
    expect(nextState.drawnCard).not.toBeNull();
    expect(nextState.deckRemainingCount).toBe(45);
  });

  it('should penalty drink and keep turn if tie (equal rank)', () => {
    const game = new GameInstance('room_1001');
    game.startNewGame(players);
    const turnPlayer = game.getState().currentTurnPlayerId;
    game.selectTarget(turnPlayer, 0);

    // Mock target and drawn cards to same rank
    const target = game.getState().publicCards[0]!;
    (game as any).state.drawnCard = { id: 'hearts_test', suit: 'hearts', rank: target.rank };

    const { state, actionResult } = game.makeGuess(turnPlayer, 'high');
    expect(actionResult.outcome).toBe('tie');
    expect(actionResult.drinksPenalty).toBe(1);
    expect(state.currentTurnPlayerId).toBe(turnPlayer); // Player continues!
    expect(state.stats[turnPlayer].drinksCount).toBe(1);
  });

  it('should advance to next player when guessed right on normal card (2..12)', () => {
    const game = new GameInstance('room_1001');
    game.startNewGame(players);
    const p1 = game.getState().currentTurnPlayerId;
    const nextExpected = p1 === 'player_1' ? 'player_2' : 'player_1';

    game.selectTarget(p1, 0);
    (game as any).state.publicCards[0] = { id: 'diamonds_5', suit: 'diamonds', rank: 5 };
    (game as any).state.drawnCard = { id: 'hearts_8', suit: 'hearts', rank: 8 }; // Correct High

    const { state, actionResult } = game.makeGuess(p1, 'high');
    expect(actionResult.outcome).toBe('correct');
    expect(actionResult.drinksPenalty).toBe(0);
    expect(state.currentTurnPlayerId).toBe(nextExpected); // Advanced!
  });

  it('should grant bonus turn and keep same player when guessing right on A or K', () => {
    const game = new GameInstance('room_1001');
    game.startNewGame(players);
    const p1 = game.getState().currentTurnPlayerId;

    game.selectTarget(p1, 0);
    (game as any).state.publicCards[0] = { id: 'diamonds_5', suit: 'diamonds', rank: 5 };
    (game as any).state.drawnCard = { id: 'spades_13', suit: 'spades', rank: 13 }; // King!

    const { state, actionResult } = game.makeGuess(p1, 'high');
    expect(actionResult.outcome).toBe('bonus_turn');
    expect(actionResult.isBoundary).toBe(true);
    expect(state.currentTurnPlayerId).toBe(p1); // Same player continues!
    expect(state.stats[p1].correctGuesses).toBe(1);
  });
});
