/** Helper to decode Google JWT Identity credentials */
export function decodeJwtResponse(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/** Initialize Google One-Tap Browser Prompt */
export function initGoogleOneTap(onSuccess) {
  if (typeof window === 'undefined') return;

  const checkScript = () => {
    if (window.google?.accounts?.id) {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '104829283726-autorescue.apps.googleusercontent.com';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              const payload = decodeJwtResponse(response.credential);
              if (payload) {
                onSuccess({
                  name: payload.name || payload.given_name,
                  email: payload.email,
                  avatar: payload.picture,
                  phone: '0300-8877665'
                });
              }
            }
          },
          auto_select: true
        });
        window.google.accounts.id.prompt();
      } catch (e) {}
    }
  };

  if (window.google?.accounts?.id) {
    checkScript();
  } else {
    setTimeout(checkScript, 500);
  }
}
