# Security Policy & OAuth Architecture — Nebula Mail

## Overview
Nebula Mail enforces strict enterprise-grade security guidelines for handling user email communications, OAuth 2.0 credentials, and AI assistant integrations.

---

## 1. Google OAuth 2.0 & Token Safety
- **Zero Client Token Exposure**: OAuth client credentials (`GOOGLE_CLIENT_SECRET`) and raw refresh tokens are NEVER exposed to client-side JavaScript bundles.
- **Server-Side Authorization**: All OAuth token exchanges, refresh token rotations, and REST calls to `https://gmail.googleapis.com` occur exclusively inside server-side API routes or Server Actions.
- **Scoped Permissions**: The application requests only the minimum necessary scopes:
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/userinfo.email`
- **HTTP-Only Cookies**: User session data is serialized inside encrypted, HTTP-only, `SameSite=Lax` cookies.

---

## 2. Human-In-The-Loop (HITL) Safety Protocol
- **No Automatic Mail Dispatch**: The AI Assistant copilot CANNOT silently send emails without user approval.
- **Confirmation State**: Calling `sendEmail` or generating a send tool call queues a `ConfirmationCard` in the user's UI. Actual provider execution (`MailProvider.sendMessage`) occurs ONLY upon explicit user click on **[Confirm & Send]**.

---

## 3. Input Validation & Data Sanitization
- **Strict Runtime Schemas**: Every AI tool payload is validated with **Zod** runtime schemas (`src/lib/ai/schemas.ts`) before execution.
- **DOM Sanitization**: HTML email bodies retrieved from external senders are sanitized using `sanitize-html` prior to rendering in the DOM, stripping malicious `<script>`, `<iframe>`, and dangerous attributes to prevent Cross-Site Scripting (XSS).

---

## 4. Environment Variables Checklist
- `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID.
- `GOOGLE_CLIENT_SECRET`: Server-side OAuth 2.0 Secret.
- `NEXTAUTH_SECRET`: Secret used to encrypt session cookies.
- `GEMINI_API_KEY`: API key for Google Gemini model tool execution.
