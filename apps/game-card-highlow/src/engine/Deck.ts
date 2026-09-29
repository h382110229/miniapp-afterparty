import { Card, CardSuit } from '@afterparty/shared-types';

const SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  /**
   * Resets and rebuilds standard 52-card deck without jokers.
   */
  public reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        this.cards.push({
          id: `${suit}_${rank}`,
          suit,
          rank,
        });
      }
    }
  }

  /**
   * Modern Fisher-Yates shuffle algorithm.
   */
  public shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Draws n cards from the top of the deck.
   */
  public draw(count: number = 1): Card[] {
    return this.cards.splice(0, count);
  }

  /**
   * Draws a single card from the top.
   */
  public drawOne(): Card | null {
    return this.cards.shift() || null;
  }

  public get remainingCount(): number {
    return this.cards.length;
  }

  public getRemainingCards(): Card[] {
    return [...this.cards];
  }
}
