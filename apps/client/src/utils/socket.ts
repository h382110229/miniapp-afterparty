import { ClientAction, ServerEvent } from '@afterparty/shared-types';

type MessageHandler = (event: ServerEvent) => void;

class SocketService {
  private socketTask: any = null;
  private isConnected = false;
  private handlers: Set<MessageHandler> = new Set();
  private pendingQueue: ClientAction[] = [];
  private reconnectTimer: any = null;
  private url: string = '';

  public connect(customUrl?: string): void {
    if (this.isConnected && this.socketTask) return;

    // Detect endpoint
    if (customUrl) {
      this.url = customUrl;
    } else {
      // In browser / H5, check location.host, or default to configured domain
      // #ifdef H5
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '3000' ? '127.0.0.1:4000' : window.location.host;
      this.url = `${protocol}//${host}/ws`;
      // #endif

      // #ifndef H5
      // WeChat Mini Program fallback endpoint (production domain)
      this.url = 'wss://afterparty.miniapp.ashawk.online/ws';
      // #endif
    }

    console.log(`[SocketService] Connecting to ${this.url}...`);

    this.socketTask = uni.connectSocket({
      url: this.url,
      complete: () => {},
    });

    this.socketTask.onOpen(() => {
      console.log('[SocketService] Connected successfully');
      this.isConnected = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Flush queue
      while (this.pendingQueue.length > 0) {
        const action = this.pendingQueue.shift();
        if (action) this.send(action);
      }
    });

    this.socketTask.onMessage((res: any) => {
      try {
        const data = JSON.parse(res.data) as ServerEvent;
        for (const handler of this.handlers) {
          handler(data);
        }
      } catch (err) {
        console.error('[SocketService] Error parsing message:', err);
      }
    });

    this.socketTask.onClose(() => {
      console.warn('[SocketService] Socket closed. Reconnecting in 3s...');
      this.isConnected = false;
      this.socketTask = null;
      this.scheduleReconnect();
    });

    this.socketTask.onError((err: any) => {
      console.error('[SocketService] Socket error:', err);
      this.isConnected = false;
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url);
    }, 3000);
  }

  public send(action: ClientAction): void {
    if (!this.isConnected || !this.socketTask) {
      this.pendingQueue.push(action);
      this.connect(this.url);
      return;
    }

    this.socketTask.send({
      data: JSON.stringify(action),
      fail: (err: any) => {
        console.error('[SocketService] Send failed:', err);
        this.pendingQueue.push(action);
      },
    });
  }

  public on(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public disconnect(): void {
    if (this.socketTask) {
      this.socketTask.close({});
      this.socketTask = null;
    }
    this.isConnected = false;
  }
}

export const socketService = new SocketService();
