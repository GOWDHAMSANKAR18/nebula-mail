import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

async function refreshAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      console.warn('[NextAuth] No refresh token stored in session token.');
      return { ...token, error: 'RefreshAccessTokenError' };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';

    if (!clientId || !clientSecret) {
      console.error('[NextAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET during token refresh.');
      return { ...token, error: 'RefreshAccessTokenError' };
    }

    console.log('[NextAuth] Refreshing expired Google OAuth access token...');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
      method: 'POST',
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error('[NextAuth] Google Token Refresh Failed:', refreshedTokens);
      return { ...token, error: 'RefreshAccessTokenError' };
    }

    console.log('[NextAuth] Google OAuth Access Token successfully refreshed!');

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in || 3600) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error('[NextAuth] Exception during token refresh:', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/',
    error: '/',
  },
  callbacks: {
    async signIn({ account }) {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
      if (!clientId || !clientSecret || clientId.includes('placeholder') || clientSecret.includes('placeholder')) {
        console.error(
          '[NextAuth] Missing or invalid GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables. Please populate .env.local with valid Google OAuth credentials.'
        );
        return false;
      }
      return true;
    },
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? token.refreshToken,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          error: undefined,
        };
      }

      // Return previous token if access token has not expired yet (with 60 second safety buffer)
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number) - 60000) {
        return token;
      }

      // Access token has expired, refresh it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  secret: (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim().length > 0)
    ? process.env.NEXTAUTH_SECRET.trim()
    : 'nebula-mail-secret-key-2026-stable-default',
  logger: {
    error(code, metadata) {
      if (code === 'JWT_SESSION_ERROR' || (metadata as any)?.error?.name === 'JWEDecryptionFailed') {
        console.warn('[NextAuth] Stale or invalid session cookie detected. Clear browser cookies or sign in again.');
        return;
      }
      console.error(`[NextAuth Error] ${code}:`, metadata);
    },
  },
};
