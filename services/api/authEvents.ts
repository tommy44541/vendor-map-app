type AccessTokenRefreshedHandler = (newAccessToken: string) => void;

const handlers = new Set<AccessTokenRefreshedHandler>();

export function onAccessTokenRefreshed(handler: AccessTokenRefreshedHandler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitAccessTokenRefreshed(newAccessToken: string) {
  handlers.forEach((h) => {
    try {
      h(newAccessToken);
    } catch (e) {
      console.warn("access token refreshed handler error:", e);
    }
  });
}

type SessionExpiredHandler = () => void;

const sessionExpiredHandlers = new Set<SessionExpiredHandler>();

export function onSessionExpired(handler: SessionExpiredHandler) {
  sessionExpiredHandlers.add(handler);
  return () => {
    sessionExpiredHandlers.delete(handler);
  };
}

export function emitSessionExpired() {
  sessionExpiredHandlers.forEach((h) => {
    try {
      h();
    } catch (e) {
      console.warn("session expired handler error:", e);
    }
  });
}


