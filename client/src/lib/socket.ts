import Constants from 'expo-constants';
import { io, type Socket } from 'socket.io-client';

/**
 * Socket.IO transport for chat.
 *
 * A single connection is shared by the whole app. That is not an optimization —
 * it is a correctness requirement. Every extra socket a screen opens means an
 * extra room membership, an extra copy of every broadcast, and an extra place for
 * a message to arrive twice. The connection outlives the screens that use it and
 * is torn down only on sign-out.
 */

const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];

const httpBaseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (metroHost ? `http://${metroHost}:3000` : 'http://localhost:3000');

/**
 * The origin, with the scheme swapped for `ws`/`wss`.
 *
 * Socket.IO is not a plain WebSocket: it upgrades through HTTP polling by
 * default, and the URL has to match what the server is actually serving. Deriving
 * it from the same base as `axios` keeps the two from drifting when
 * `EXPO_PUBLIC_API_URL` changes between environments.
 */
export const socketURL = httpBaseURL.replace(/^http/, 'ws');

type Listener = (payload: unknown) => void;

class ChatSocket {
  private socket: Socket | null = null;
  private token: string | null = null;

  /** Set by the gateway's `connection:ready`; cleared by any disconnect. */
  private ready = false;

  /** Fanned out to `ChatProvider` and every screen that renders a connection state. */
  private statusListeners = new Set<(connected: boolean) => void>();

  /**
   * Opens the connection, or reuses the live one.
   *
   * Reconnecting on every mount is what causes the "message I sent appeared twice"
   * and "the badge went up for my own message" bugs, so the token is compared
   * first: an already-open socket for the same session is kept.
   */
  connect(token: string) {
    if (this.socket && this.token === token) return this.socket;
    if (this.socket) this.disconnect();

    this.token = token;

    this.socket = io(socketURL, {
      auth: { token },
      // WebSocket only. The default starts with HTTP long-polling, which works
      // but costs an extra round trip and, on React Native, has historically been
      // the flakier of the two transports. Nothing here needs the fallback.
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 8000,
      // React Native suspends sockets in the background and the app can be killed
      // entirely, so retries are unbounded in *count* but backed off hard:
      // `reconnectionDelayMax` is what keeps a dead server from spinning the radio.
      // A finite attempt count would give up silently on a phone that was in a
      // tunnel for a minute, and the user would see "offline" with no way to tell
      // that reconnecting was never attempted again.
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    /**
     * The transport coming up is deliberately *not* announced as connected.
     *
     * Status means "a send will be answered", and until the gateway has resolved
     * the session it will not be. Announcing `connect` here is what makes an app
     * look ready for a few hundred milliseconds on every reconnect and then
     * reject the first action.
     */
    this.socket.on('connect', () => {
      this.ready = false;
      this.notifyStatus(false);
    });
    this.socket.on('disconnect', () => {
      this.ready = false;
      this.notifyStatus(false);
    });
    this.socket.on('connect_error', () => {
      this.ready = false;
      this.notifyStatus(false);
    });
    this.socket.on('connection:ready', () => {
      this.ready = true;
      this.notifyStatus(true);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Whether the *server* has finished authenticating this socket.
   *
   * Deliberately not the same thing as `isConnected()`. The gateway's
   * `handleConnection` is async — it resolves the session before it parks the
   * profile on `socket.data` — so there is a window after every connect, including
   * every reconnect, where the transport is up but `socket.data.user` does not
   * exist yet. Anything sent in that window is refused with a 401.
   *
   * The gap is easy to miss because it is invisible on the first connection and
   * reappears on every reconnect, which is exactly when a client re-subscribes.
   * So `connection:ready` is the event that flips this flag, and everything that
   * talks to the server waits on it.
   */
  isReady(): boolean {
    return this.ready && this.isConnected();
  }

  /**
   * Whether a send can possibly be acknowledged.
   *
   * Callers check this *before* emitting rather than relying on a timeout. A
   * Socket.IO ack callback simply never fires once the transport is down, so a
   * send issued while offline would hang until it timed out — which reads as a
   * slow network rather than as "you are offline".
   *
   * Gates on `connection:ready`, not on the transport: a send in the handshake
   * window would come back 401 rather than never coming back, which is a much
   * worse failure to explain to somebody who is looking at a spinner.
   */
  canSend(): boolean {
    return this.isReady();
  }

  onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(connected: boolean) {
    for (const listener of this.statusListeners) listener(connected);
  }

  /**
   * Subscribes to a server-push event, returning the unsubscribe function.
   *
   * Listeners are attached per event name and never removed here; the caller's
   * return value is what tears them down. Safe to call for an event with no
   * listeners — Socket.IO allows it.
   */
  on<T>(event: string, handler: (payload: T) => void): () => void {
    const socket = this.socket;
    if (!socket) return () => {};

    const listener = handler as Listener;
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }

  /**
   * Emits an event and resolves with the server's acknowledgement.
   *
   * Resolves — never rejects — with a failure value when the socket is down,
   * because the caller has to render a retry affordance either way and a rejected
   * promise here would be indistinguishable from a thrown network error. The
   * ack timeout is the real safety net: it catches the case where the transport
   * reports itself connected but the server never answers.
   */
  emitWithAck<TRequest, TAck>(
    event: string,
    payload: TRequest,
    timeoutMs = 10000,
  ): Promise<TAck> {
    if (!this.socket || !this.socket.connected) {
      return Promise.resolve(OFFLINE_ACK as TAck);
    }

    return new Promise<TAck>((resolve) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          code: 408,
          message: 'The server did not respond. Tap to retry.',
        } as TAck);
      }, timeoutMs);

      this.socket!.emit(event, payload, (ack: TAck) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ack);
      });
    });
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
    this.ready = false;
    this.notifyStatus(false);
  }
}

/**
 * The shape returned when a send is attempted while offline.
 *
 * Shared rather than constructed per call site so the `ok: false` branch the UI
 * renders is provably the same one.
 */
export const OFFLINE_ACK = {
  ok: false,
  code: 0,
  message: 'You are offline. The message was not sent.',
} as const;

/** True for the two "could not even be sent" codes: offline and no reply. */
export function isTransientAck(
  ack: { ok: boolean; code?: number } | null | undefined,
): boolean {
  return ack?.ok === false && (ack.code === 0 || ack.code === 408);
}

export const chatSocket = new ChatSocket();