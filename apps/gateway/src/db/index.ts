import pg from 'pg';

const { Pool } = pg;

export const dbPool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'hawk',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'afterparty',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export async function initDatabase(): Promise<void> {
  try {
    const client = await dbPool.connect();
    try {
      console.log('[Gateway DB] Checking and initializing PostgreSQL tables...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          platform VARCHAR(16) NOT NULL DEFAULT 'guest',
          openid VARCHAR(64) UNIQUE,
          nickname VARCHAR(64) NOT NULL,
          avatar_url VARCHAR(255) NOT NULL,
          total_games INT DEFAULT 0,
          total_drinks INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS game_matches (
          id VARCHAR(64) PRIMARY KEY,
          game_type VARCHAR(32) NOT NULL DEFAULT 'card_highlow',
          room_code VARCHAR(8) NOT NULL,
          host_user_id VARCHAR(64) NOT NULL,
          players_count INT NOT NULL,
          total_drinks INT DEFAULT 0,
          mvp_drinker_id VARCHAR(64),
          summary_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          finished_at TIMESTAMP
        );
      `);
      console.log('[Gateway DB] PostgreSQL tables initialized successfully.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn(`[Gateway DB] PostgreSQL not connected: ${err.message}. Running in memory-fallback mode.`);
  }
}
