import { defineStore } from 'pinia';
import { ref } from 'vue';
import { User } from '@afterparty/shared-types';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const token = ref<string>('');

  function initUser() {
    try {
      const cachedToken = uni.getStorageSync('afterparty_token');
      const cachedUser = uni.getStorageSync('afterparty_user');
      if (cachedToken && !cachedToken.startsWith('mock_token_') && cachedUser) {
        token.value = cachedToken;
        user.value = JSON.parse(cachedUser);
        console.log('[UserStore] Restored valid session for user:', user.value?.nickname);
        return;
      }
    } catch {
      // Storage read fallback
    }

    // Default mock guest identity if none exists
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const guestUser: User = {
      id: guestId,
      platform: 'guest',
      nickname: `酒仙_${guestId.substring(guestId.length - 4)}`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
      isGuest: true,
    };
    user.value = guestUser;
    token.value = '';
    console.log('[UserStore] Initialized fresh guest:', guestUser.nickname);
  }

  function setUser(newUser: User, newToken: string) {
    user.value = newUser;
    token.value = newToken;
    try {
      uni.setStorageSync('afterparty_token', newToken);
      uni.setStorageSync('afterparty_user', JSON.stringify(newUser));
    } catch {
      // Storage write error
    }
  }

  function updateProfile(nickname: string, avatarUrl?: string) {
    if (!user.value) return;
    user.value.nickname = nickname;
    if (avatarUrl) user.value.avatarUrl = avatarUrl;
    try {
      uni.setStorageSync('afterparty_user', JSON.stringify(user.value));
    } catch {
      // Storage write error
    }
  }

  async function ensureAuth(baseUrl?: string): Promise<string> {
    if (token.value && !token.value.startsWith('mock_token_')) {
      return token.value;
    }

    try {
      const url = baseUrl ? `${baseUrl}/api/auth/guest` : 'https://afterparty.miniapp.hawkren.online/api/auth/guest';
      const res = await uni.request({
        url,
        method: 'POST',
        data: {
          nickname: user.value?.nickname,
          avatarUrl: user.value?.avatarUrl,
        },
      });

      const data = res.data as any;
      if (data && data.token && data.user) {
        setUser(data.user, data.token);
        return data.token;
      }
    } catch (e) {
      console.error('[UserStore] Failed to authenticate guest with server:', e);
    }

    return token.value;
  }

  return {
    user,
    token,
    initUser,
    setUser,
    updateProfile,
    ensureAuth,
  };
});
