/**
 * Typed access to the `socket.io-client` factory.
 *
 * Two traps worth naming, because both fail in ways that look like server bugs:
 *
 * 1. `socket.io` is the **server** package. Its callable default is
 *    `(srv, opts) => new Server(...)`, so importing `io` from it and calling it
 *    with a URL constructs a socket.io server whose "HTTP server" is a string —
 *    engine.io then fails on `server.listeners is not a function`. The client
 *    lives in `socket.io-client`.
 *
 * 2. `socket.io-client` publishes `manager.js` as a CJS module whose default
 *    export is the module object with `io` hung off it. Under NodeNext, a bare
 *    `import { io } from 'socket.io-client'` resolves to `undefined` even though
 *    it type-checks, so the property is read explicitly here.
 *
 * Confining both to one file keeps the casts out of the test bodies.
 */
import socketIoClient from 'socket.io-client';
import type {
  Socket as ClientSocket,
  Manager,
  SocketOptions,
} from 'socket.io-client';

/**
 * Client options as this suite needs them.
 *
 * `SocketOptions` omits `transports`, which socket.io-client does support as a
 * runtime option (it is declared on `Partial<ManagerOptions & ...>` upstream but
 * not threaded through the exported type). Declared here so the test can pin
 * `transports: ['websocket']` — worth doing, because the default tries HTTP
 * long-polling first and this suite is not testing that upgrade path.
 */
type TestSocketOptions = SocketOptions & {
  transports?: ('polling' | 'websocket')[];
  reconnection?: boolean;
  /**
   * Backoff overrides, for the reconnect test. The reconnect case needs a fast
   * first retry so the suite is not waiting seconds to prove the socket comes
   * back, and the exported `SocketOptions` does not carry these either.
   */
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  reconnectionAttempts?: number;
};

type IoFactory = {
  (uri?: string, opts?: TestSocketOptions): ClientSocket;
  Manager: typeof Manager;
  connect: (uri: string, opts?: TestSocketOptions) => ClientSocket;
};

const resolved = socketIoClient as unknown as IoFactory;

export const io = resolved;
export type { ClientSocket };