import jwt from 'jsonwebtoken';
import { User } from '@afterparty/shared-types';
import { dbPool } from '../../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'afterparty-secret-key-2026';
const WX_APPID = process.env.WX_APPID || '';
const WX_APPSECRET = process.env.WX_APPSECRET || '';

const PARTY_NICKNAMES = [
  '酒仙本仙',
  '微醺宇航员',
  '莫吉托学者',
  '深水炸弹',
  '野格小猎手',
  '长岛冰茶控',
  '精酿鉴赏师',
  '龙舌兰日落',
  '今晚不醉不归',
  '千杯不醉',
  '摇骰之神',
  '幸运大扑克',
];

const PARTY_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=afterparty1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=afterparty2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=afterparty3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=afterparty4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=afterparty5',
  'https://api.dicebear.com/7.x/bottts/svg?seed=afterparty6',
];

export class AuthService {
  /**
   * Generates guest user with fun party nickname & avatar.
   */
  public static async createGuestUser(customNickname?: string, customAvatar?: string): Promise<{ user: User; token: string }> {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const randomNick = PARTY_NICKNAMES[Math.floor(Math.random() * PARTY_NICKNAMES.length)];
    const randomAvatar = PARTY_AVATARS[Math.floor(Math.random() * PARTY_AVATARS.length)];

    const user: User = {
      id: guestId,
      platform: 'guest',
      nickname: customNickname || randomNick,
      avatarUrl: customAvatar || randomAvatar,
      isGuest: true,
    };

    // Save to PostgreSQL if available
    try {
      await dbPool.query(
        `INSERT INTO users (id, platform, nickname, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET nickname = $3, avatar_url = $4, updated_at = NOW()`,
        [user.id, user.platform, user.nickname, user.avatarUrl]
      );
    } catch {
      // Postgres error ignored in guest fallback
    }

    const token = jwt.sign({ userId: user.id, isGuest: true }, JWT_SECRET, { expiresIn: '7d' });
    return { user, token };
  }

  /**
   * WeChat code2Session login.
   */
  public static async wechatLogin(code: string, nickname?: string, avatarUrl?: string): Promise<{ user: User; token: string }> {
    let openid = `wx_mock_${Date.now()}`;

    if (WX_APPID && WX_APPSECRET) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_APPSECRET}&js_code=${code}&grant_type=authorization_code`;
        const res = await fetch(url);
        const data = await res.json() as any;
        if (data.openid) {
          openid = data.openid;
        } else {
          console.warn('[WeChat Auth] code2session returned error:', data);
        }
      } catch (err: any) {
        console.error('[WeChat Auth] Failed to fetch session:', err.message);
      }
    }

    const defaultNick = nickname || PARTY_NICKNAMES[Math.floor(Math.random() * PARTY_NICKNAMES.length)];
    const defaultAvatar = avatarUrl || PARTY_AVATARS[Math.floor(Math.random() * PARTY_AVATARS.length)];

    const user: User = {
      id: openid,
      platform: 'weixin',
      nickname: defaultNick,
      avatarUrl: defaultAvatar,
      isGuest: false,
    };

    try {
      await dbPool.query(
        `INSERT INTO users (id, platform, openid, nickname, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET nickname = $4, avatar_url = $5, updated_at = NOW()`,
        [user.id, user.platform, openid, user.nickname, user.avatarUrl]
      );
    } catch {
      // Postgres error fallback
    }

    const token = jwt.sign({ userId: user.id, isGuest: false }, JWT_SECRET, { expiresIn: '30d' });
    return { user, token };
  }

  public static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  }
}
