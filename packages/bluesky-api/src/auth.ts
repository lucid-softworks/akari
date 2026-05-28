import { BlueskyApiClient } from "./client";
import type { BlueskySession } from "./types";

/**
 * Bluesky API authentication methods
 */
export class BlueskyAuth extends BlueskyApiClient {
  /**
   * Creates a new session with the Bluesky API.
   * @param identifier - User's handle or email
   * @param password - App password
   * @param authFactorToken - Email-issued 2FA token when the account has
   *   `emailAuthFactor` enabled. If you don't pass it and the account
   *   requires 2FA, the PDS returns an `AuthFactorTokenRequired` error
   *   and emails the user a fresh token to retry with.
   */
  async createSession(
    identifier: string,
    password: string,
    authFactorToken?: string
  ): Promise<BlueskySession> {
    return this.makeRequest<BlueskySession>(
      "/com.atproto.server.createSession",
      {
        method: "POST",
        body: {
          identifier,
          password,
          ...(authFactorToken ? { authFactorToken } : {}),
        },
      }
    );
  }

  /**
   * Asks the PDS to email the user a verification token they can paste
   * back into `confirmEmail` to verify their address. Also used as the
   * first step in the 2FA enrolment flow: confirming an already-verified
   * address with `confirmEmail` toggles `emailAuthFactor: true`.
   */
  async requestEmailConfirmation(accessJwt: string): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      "/com.atproto.server.requestEmailConfirmation",
      accessJwt,
      { method: "POST" }
    );
  }

  /**
   * Confirms the user's email with the token from
   * `requestEmailConfirmation`. The PDS flips `emailConfirmed: true` and,
   * if the email was already confirmed, also flips `emailAuthFactor:
   * true` — i.e. this is the same call you use to enable email-based 2FA.
   */
  async confirmEmail(
    accessJwt: string,
    email: string,
    token: string
  ): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      "/com.atproto.server.confirmEmail",
      accessJwt,
      {
        method: "POST",
        body: { email, token },
      }
    );
  }

  /**
   * Creates a brand-new account on the PDS this client is pointed at.
   * Returns a session in the same shape as `createSession`, so the caller
   * can flow straight into the existing token-storage pipeline. `inviteCode`
   * is only required when the PDS is in invite-only mode (bsky.social isn't
   * anymore, but smaller PDSes may be).
   */
  async createAccount(args: {
    email: string;
    handle: string;
    password: string;
    inviteCode?: string;
  }): Promise<BlueskySession> {
    const { email, handle, password, inviteCode } = args;
    return this.makeRequest<BlueskySession>(
      "/com.atproto.server.createAccount",
      {
        method: "POST",
        body: {
          email,
          handle,
          password,
          ...(inviteCode ? { inviteCode } : {}),
        },
      },
    );
  }

  /**
   * Refreshes an existing session using the refresh token
   * @param refreshJwt - The refresh JWT token
   * @returns Promise resolving to new session data
   */
  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    return this.makeRequest<BlueskySession>(
      "/com.atproto.server.refreshSession",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshJwt}`,
        },
      }
    );
  }

  /**
   * Mints a short-lived service auth JWT scoped to a single audience
   * (e.g. the video transcode service) and a single lexicon method.
   * Required to talk to services hosted off the user's PDS.
   */
  async getServiceAuth(
    accessJwt: string,
    aud: string,
    lxm: string,
    expSeconds: number = 60 * 5,
  ): Promise<{ token: string }> {
    const exp = Math.floor(Date.now() / 1000) + expSeconds;
    return this.makeAuthenticatedRequest<{ token: string }>(
      "/com.atproto.server.getServiceAuth",
      accessJwt,
      {
        params: { aud, lxm, exp: String(exp) },
      },
    );
  }

  /**
   * Reads the current session's account info — handle, did, email, and
   * email-confirmation/auth-factor flags. Useful for surfacing the user's
   * email address (which isn't returned by `app.bsky.actor.getProfile`)
   * in account settings.
   */
  async getSession(accessJwt: string): Promise<{
    handle: string;
    did: string;
    email?: string;
    emailConfirmed?: boolean;
    emailAuthFactor?: boolean;
    didDoc?: Record<string, unknown>;
    active?: boolean;
  }> {
    return this.makeAuthenticatedRequest('/com.atproto.server.getSession', accessJwt);
  }

  /**
   * Updates the user's handle. atproto rejects the change if the handle
   * is already taken or doesn't satisfy the host's policies — callers
   * should surface the server error directly so the user can correct it.
   */
  async updateHandle(accessJwt: string, handle: string): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      '/com.atproto.identity.updateHandle',
      accessJwt,
      {
        method: 'POST',
        body: { handle },
      },
    );
  }

  /**
   * Sends a verification token to the user's currently-registered email
   * so they can confirm an upcoming email change. The token has to be
   * passed back to `updateEmail` to complete the change.
   */
  async requestEmailUpdate(accessJwt: string): Promise<{ tokenRequired: boolean }> {
    return this.makeAuthenticatedRequest<{ tokenRequired: boolean }>(
      '/com.atproto.server.requestEmailUpdate',
      accessJwt,
      { method: 'POST' },
    );
  }

  /**
   * Updates the user's email address. `token` is required when the prior
   * `requestEmailUpdate` returned `tokenRequired: true` — the PDS sends
   * it to the existing email and the user has to copy it into the form.
   */
  async updateEmail(
    accessJwt: string,
    email: string,
    token?: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      '/com.atproto.server.updateEmail',
      accessJwt,
      {
        method: 'POST',
        body: token ? { email, token } : { email },
      },
    );
  }

  /**
   * Kicks off the password-reset flow. Bluesky emails the user a token
   * which they paste into `resetPassword`. Unauthenticated — the email
   * is keyed by the address, not the access JWT, so this works even
   * when the user is signed out.
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.makeRequest<unknown>(
      '/com.atproto.server.requestPasswordReset',
      {
        method: 'POST',
        body: { email },
      },
    );
  }

  /**
   * Deactivates the account. `deleteAfter` is an optional ISO 8601
   * datetime — when present, the account is hard-deleted at that
   * point unless the user logs back in to revive it.
   */
  async deactivateAccount(accessJwt: string, deleteAfter?: string): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      '/com.atproto.server.deactivateAccount',
      accessJwt,
      {
        method: 'POST',
        body: deleteAfter ? { deleteAfter } : {},
      },
    );
  }

  /**
   * Sends an account-deletion confirmation token to the user's email.
   * The token is passed back to `deleteAccount` together with the
   * account password to actually destroy the account.
   */
  async requestAccountDelete(accessJwt: string): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      '/com.atproto.server.requestAccountDelete',
      accessJwt,
      { method: 'POST' },
    );
  }

  /**
   * Permanently deletes the account. Requires the email-issued token
   * from `requestAccountDelete` and the account password as a final
   * proof-of-ownership check. The PDS revokes all sessions on success
   * — every other client signed in to this account will start
   * returning auth errors.
   */
  async deleteAccount(
    did: string,
    password: string,
    token: string,
  ): Promise<void> {
    await this.makeRequest<unknown>('/com.atproto.server.deleteAccount', {
      method: 'POST',
      body: { did, password, token },
    });
  }

  /**
   * Downloads the user's repo as a CAR file (binary). Returns a Blob
   * the caller can hand to a share sheet or `expo-file-system`.
   */
  async exportRepo(accessJwt: string, did: string): Promise<Blob> {
    const url = this.buildXrpcUrl('/com.atproto.sync.getRepo', { did });
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessJwt}` },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to export repo: ${response.status} ${text}`);
    }
    return response.blob();
  }

  /** Lists every app password (name + creation timestamp) on the user's account. */
  async listAppPasswords(accessJwt: string): Promise<{
    passwords: { name: string; createdAt: string; privileged?: boolean }[];
  }> {
    return this.makeAuthenticatedRequest<{
      passwords: { name: string; createdAt: string; privileged?: boolean }[];
    }>('/com.atproto.server.listAppPasswords', accessJwt);
  }

  /**
   * Creates a new app password. The plaintext password is only returned in
   * this response — it can never be retrieved again, so the caller must
   * surface it to the user immediately.
   */
  async createAppPassword(
    accessJwt: string,
    name: string,
    privileged = false,
  ): Promise<{ name: string; password: string; createdAt: string; privileged?: boolean }> {
    return this.makeAuthenticatedRequest<{
      name: string;
      password: string;
      createdAt: string;
      privileged?: boolean;
    }>('/com.atproto.server.createAppPassword', accessJwt, {
      method: 'POST',
      body: { name, privileged },
    });
  }

  /** Revokes a previously-created app password by its display name. */
  async revokeAppPassword(accessJwt: string, name: string): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>(
      '/com.atproto.server.revokeAppPassword',
      accessJwt,
      {
        method: 'POST',
        body: { name },
      },
    );
  }
}
