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


