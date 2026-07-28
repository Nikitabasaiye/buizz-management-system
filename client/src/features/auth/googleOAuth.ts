"use client";

export type GoogleOAuthRole = "customer" | "organizer" | "admin" | "super-admin";
export type SocialOAuthRole = GoogleOAuthRole;

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      AppEvents?: { logPageView: () => void };
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options?: { scope?: string; auth_type?: string; return_scopes?: boolean; config_id?: string },
      ) => void;
      getLoginStatus: (callback: (response: FacebookLoginResponse) => void) => void;
    };
  }
}

type FacebookLoginResponse = {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken?: string;
    expiresIn?: string | number;
    signedRequest?: string;
    userID?: string;
  };
};

// Canonical redirect URI — must exactly match what is registered in Google Cloud Console
// Authorized redirect URIs. Add ALL of these in the console:
//   https://www.buizz.com/auth/google/callback
//   https://buizz.com/auth/google/callback
//   https://admin.buizz.com/auth/google/callback
//   http://localhost:3000/auth/google/callback  (dev)
function getGoogleRedirectUri(): string {
  const origin = window.location.origin;
  // Normalise: treat bare domain same as www
  if (origin === "https://buizz.com") return "https://www.buizz.com/auth/google/callback";
  return `${origin}/auth/google/callback`;
}

export function startGoogleOAuth(role: GoogleOAuthRole) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google login is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "token id_token",
    scope: "openid email profile",
    nonce: Math.random().toString(36).slice(2),
    prompt: "select_account",
    state: role,
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function getFacebookRedirectUri(): string {
  const origin = window.location.origin;
  if (origin === "https://buizz.com") return "https://www.buizz.com/auth/facebook/callback";
  return `${origin}/auth/facebook/callback`;
}

function getFacebookSdkVersion(): string {
  return process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION || "v25.0";
}

function getFacebookLoginConfigId(): string | undefined {
  return process.env.NEXT_PUBLIC_FACEBOOK_LOGIN_CONFIG_ID || undefined;
}

type FacebookPublicConfig = {
  configured?: boolean;
  appId?: string | null;
  apiVersion?: string;
  loginConfigId?: string | null;
};

async function getFacebookPublicConfig(): Promise<FacebookPublicConfig> {
  const configuredAppId =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_META_APP_ID;

  if (configuredAppId) {
    return {
      appId: configuredAppId,
      apiVersion: getFacebookSdkVersion(),
      loginConfigId: getFacebookLoginConfigId(),
    };
  }

  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://api.buizz.com/api/v1"
  ).replace(/\/$/, "");
  const response = await fetch(`${apiBase}/meta/facebook-config`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  const data = payload?.data;

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      "Facebook login configuration is temporarily unavailable.",
    );
  }
  if (!data?.configured || !data?.appId) {
    throw new Error("Facebook login is not configured on the API server.");
  }

  return data;
}

function loadFacebookSdk(appId: string, apiVersion: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook login is only available in the browser."));
  }

  if (window.FB) return Promise.resolve();

  return new Promise((resolve, reject) => {
    window.fbAsyncInit = function fbAsyncInit() {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: apiVersion,
      });
      window.FB?.AppEvents?.logPageView();
      resolve();
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Facebook SDK failed to load.")), { once: true });
      return;
    }

    const firstScript = document.getElementsByTagName("script")[0];
    const sdkScript = document.createElement("script");
    sdkScript.id = "facebook-jssdk";
    sdkScript.async = true;
    sdkScript.defer = true;
    sdkScript.src = "https://connect.facebook.net/en_US/sdk.js";
    sdkScript.onerror = () => reject(new Error("Facebook SDK failed to load."));
    firstScript.parentNode?.insertBefore(sdkScript, firstScript);
  });
}

function redirectWithFacebookToken(role: SocialOAuthRole, accessToken: string) {
  const params = new URLSearchParams({
    access_token: accessToken,
    state: role,
  });
  window.location.href = `${getFacebookRedirectUri()}#${params}`;
}

export async function startFacebookOAuth(role: SocialOAuthRole) {
  const facebookConfig = await getFacebookPublicConfig();
  const clientId = facebookConfig.appId;
  if (!clientId) {
    throw new Error("Facebook login is not configured on the API server.");
  }

  await loadFacebookSdk(
    clientId,
    facebookConfig.apiVersion || getFacebookSdkVersion(),
  );

  return new Promise<void>((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK is not ready."));
      return;
    }

    const loginOptions: {
      scope: string;
      auth_type: string;
      return_scopes: boolean;
      config_id?: string;
    } = {
      scope: "email,public_profile",
      auth_type: "rerequest",
      return_scopes: true,
    };
    const configId = facebookConfig.loginConfigId || getFacebookLoginConfigId();
    if (configId) loginOptions.config_id = configId;

    window.FB.login((loginResponse) => {
      const accessToken = loginResponse.authResponse?.accessToken;
      if (loginResponse.status !== "connected" || !accessToken) {
        reject(new Error("Facebook login was cancelled or not authorized."));
        return;
      }

      redirectWithFacebookToken(role, accessToken);
      resolve();
    }, loginOptions);
  });
}
