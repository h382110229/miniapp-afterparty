import {
  Card,
  CardHighLowState,
  ActionResult,
  PlayerStats,
  GuessType,
  GuessOutcome,
} from '@afterparty/shared-types';
import { Deck } from './Deck.js';

export interface PlayerInfo {
  id: string;
  nickname: string;
  avatarUrl: string;
}

export class GameInstance {
  public readonly roomId: string;
  private deck: Deck;
  private state: CardHighLowState;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.deck = new Deck();
    this.state = this.getEmptyState(roomId);
  }

  private getEmptyState(roomId: string): CardHighLowState {
    return {
      roomId,
      phase: 'shuffling',
      deckRemainingCount: 52,
      publicCards: [null, null, null, null, null, null],
      activeTargetIndex: null,
      drawnCard: null,
      drawnCardRevealed: false,
      currentTurnPlayerId: '',
      turnPlayerOrder: [],
      currentTurnIndex: 0,
      lastResult: null,
      stats: {},
      totalDrinksInGame: 0,
      mvpDrinkerId: null,
    };
  }

  public getState(): CardHighLowState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Initializes or restarts game with seated players.
   */
  public startNewGame(players: PlayerInfo[]): CardHighLowState {
    if (players.length === 0) {
      throw new Error('Cannot start game without players');
    }

    this.deck.reset();
    this.deck.shuffle();

    // Draw 6 cards for public area
    const publicCards: (Card | null)[] = this.deck.draw(6);

    const turnPlayerOrder = players.map(p => p.id);
    // Random starting player index
    const currentTurnIndex = Math.floor(Math.random() * turnPlayerOrder.length);
    const currentTurnPlayerId = turnPlayerOrder[currentTurnIndex];

    const stats: Record<string, PlayerStats> = {};
    for (const p of players) {
      stats[p.id] = {
        userId: p.id,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        drinksCount: 0,
        correctGuesses: 0,
        consecutiveWins: 0,
        maxConsecutiveWins: 0,
      };
    }

    this.state = {
      roomId: this.roomId,
      phase: 'selecting_target',
      deckRemainingCount: this.deck.remainingCount,
      publicCards,
      activeTargetIndex: null,
      drawnCard: null,
      drawnCardRevealed: false,
      currentTurnPlayerId,
      turnPlayerOrder,
      currentTurnIndex,
      lastResult: null,
      stats,
      totalDrinksInGame: 0,
      mvpDrinkerId: null,
    };

    return this.getState();
  }

  /**
   * Current player selects 1 of the 6 public cards as the comparison target.
   */
  public selectTarget(playerId: string, cardIndex: number): CardHighLowState {
    if (this.state.phase !== 'selecting_target') {
      throw new Error(`Invalid phase: current phase is ${this.state.phase}`);
    }
    if (playerId !== this.state.currentTurnPlayerId) {
      throw new Error(`Not your turn: current player is ${this.state.currentTurnPlayerId}`);
    }
    if (cardIndex < 0 || cardIndex >= 6 || !this.state.publicCards[cardIndex]) {
      throw new Error(`Invalid target card index: ${cardIndex}`);
    }

    // Draw 1 card face-down from deck
    const drawn = this.deck.drawOne();
    if (!drawn) {
      this.state.phase = 'game_over';
      this.calculateMvp();
      return this.getState();
    }

    this.state.activeTargetIndex = cardIndex;
    this.state.drawnCard = drawn;
    this.state.drawnCardRevealed = false;
    this.state.deckRemainingCount = this.deck.remainingCount;
    this.state.phase = 'guessing';

    return this.getState();
  }

  /**
   * Current player guesses 'high' or 'low' relative to target card.
   */
  public makeGuess(playerId: string, guess: GuessType): {
    state: CardHighLowState;
    actionResult: ActionResult;
  } {
    if (this.state.phase !== 'guessing') {
      throw new Error(`Invalid phase: current phase is ${this.state.phase}`);
    }
    if (playerId !== this.state.currentTurnPlayerId) {
      throw new Error(`Not your turn: current player is ${this.state.currentTurnPlayerId}`);
    }
    if (this.state.activeTargetIndex === null || !this.state.drawnCard) {
      throw new Error('No target card or drawn card present');
    }

    const targetCard = this.state.publicCards[this.state.activeTargetIndex]!;
    const drawnCard = this.state.drawnCard!;
    const isBoundary = drawnCard.rank === 1 || drawnCard.rank === 13;

    let outcome: GuessOutcome;
    let drinksPenalty = 0;
    let message = '';

    const playerStat = this.state.stats[playerId] || {
      userId: playerId,
      nickname: 'Player',
      avatarUrl: '',
      drinksCount: 0,
      correctGuesses: 0,
      consecutiveWins: 0,
      maxConsecutiveWins: 0,
    };

    if (drawnCard.rank === targetCard.rank) {
      // Tie -> Lose!
      outcome = 'tie';
      drinksPenalty = 1;
      message = `平局判定输！点数同为 ${drawnCard.rank}，罚酒一杯，请继续留庄！`;
      playerStat.drinksCount += 1;
      playerStat.consecutiveWins = 0;
      this.state.totalDrinksInGame += 1;
    } else {
      const isActuallyHigh = drawnCard.rank > targetCard.rank;
      const guessedRight = (guess === 'high' && isActuallyHigh) || (guess === 'low' && !isActuallyHigh);

      if (!guessedRight) {
        // Wrong guess -> Lose!
        outcome = 'wrong';
        drinksPenalty = 1;
        message = `猜错了！原牌 ${targetCard.rank}，摸到 ${drawnCard.rank}，罚酒一杯继续留庄！`;
        playerStat.drinksCount += 1;
        playerStat.consecutiveWins = 0;
        this.state.totalDrinksInGame += 1;
      } else {
        // Guessed Right!
        playerStat.correctGuesses += 1;
        playerStat.consecutiveWins += 1;
        if (playerStat.consecutiveWins > playerStat.maxConsecutiveWins) {
          playerStat.maxConsecutiveWins = playerStat.consecutiveWins;
        }

        if (isBoundary) {
          // Boundary card A or K -> Bonus turn!
          outcome = 'bonus_turn';
          drinksPenalty = 0;
          const cardName = drawnCard.rank === 1 ? 'A (极小1)' : 'K (极大13)';
          message = `天选之子！猜中且摸到极值牌 ${cardName}，触发暴击连击，继续出牌！`;
        } else {
          // Normal right guess -> Pass to next player
          outcome = 'correct';
          drinksPenalty = 0;
          message = `恭喜猜对！原牌 ${targetCard.rank}，摸到 ${drawnCard.rank}，顺利交接下一位！`;
        }
      }
    }

    const actionResult: ActionResult = {
      playerId,
      targetCard,
      drawnCard,
      guess,
      outcome,
      drinksPenalty,
      message,
      isBoundary,
    };

    this.state.lastResult = actionResult;
    this.state.drawnCardRevealed = true;
    this.state.publicCards[this.state.activeTargetIndex] = drawnCard;

    // Determine next turn or game over
    if (this.deck.remainingCount === 0) {
      this.state.phase = 'game_over';
      this.calculateMvp();
    } else {
      this.state.phase = 'selecting_target';
      this.state.activeTargetIndex = null;
      this.state.drawnCard = null;
      this.state.drawnCardRevealed = false;

      // Advance turn if not continuing
      if (outcome === 'correct') {
        this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.turnPlayerOrder.length;
        this.state.currentTurnPlayerId = this.state.turnPlayerOrder[this.state.currentTurnIndex];
      }
      // If 'wrong', 'tie', or 'bonus_turn', currentTurnPlayerId stays the same!
    }

    return {
      state: this.getState(),
      actionResult,
    };
  }

  private calculateMvp(): void {
    let maxDrinks = -1;
    let mvpId: string | null = null;
    for (const p of Object.values(this.state.stats)) {
      if (p.drinksCount > maxDrinks) {
        maxDrinks = p.drinksCount;
        mvpId = p.userId;
      }
    }
    this.state.mvpDrinkerId = mvpId;
  }
}
