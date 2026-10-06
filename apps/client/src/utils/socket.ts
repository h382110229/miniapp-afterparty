import { ClientAction, ServerEvent } from '@afterparty/shared-types';

type MessageHandler = (event: ServerEvent) => void;

class SocketService {
  private socketTask: any = null;
  private isConnected = false;
  private handlers: Set<MessageHandler> = new Set();
  private pendingQueue: ClientAction[] = [];
  private reconnectTimer: any = null;
  private url: string = '';

  private isConnecting = false;

  public connect(customUrl?: string): void {
    if (this.isConnected) return;
    if (this.isConnecting) return;

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
      this.url = 'wss://afterparty.miniapp.hawkren.online/ws';
      // #endif
    }

    console.log(`[SocketService] Connecting to ${this.url}...`);
    this.isConnecting = true;

    try {
      this.socketTask = uni.connectSocket({
        url: this.url,
        complete: () => {},
      });

      this.socketTask.onOpen(() => {
        console.log('[SocketService] Connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
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
        this.isConnecting = false;
        this.socketTask = null;
        this.scheduleReconnect();
      });

      this.socketTask.onError((err: any) => {
        console.error('[SocketService] Socket error:', err);
        this.isConnected = false;
        this.isConnecting = false;
      });
    } catch (err) {
      this.isConnecting = false;
      console.error('[SocketService] connectSocket exception:', err);
    }
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

    try {
      this.socketTask.send({
        data: JSON.stringify(action),
        fail: (err: any) => {
          console.warn('[SocketService] Send failed, re-queueing action:', action.type, err?.errMsg);
          this.pendingQueue.push(action);
          if (err?.errMsg && err.errMsg.includes('not OPEN')) {
            this.isConnected = false;
            this.connect(this.url);
          }
        },
      });
    } catch (err) {
      console.error('[SocketService] Send exception:', err);
      this.pendingQueue.push(action);
    }
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
