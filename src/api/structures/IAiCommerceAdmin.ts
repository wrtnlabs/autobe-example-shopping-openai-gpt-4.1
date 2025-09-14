import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IAiCommerceAdmin {
  /**
   * Payload for secure admin registration. Only for internal/platform use,
   * not for public endpoints.
   */
  export type IJoin = {
    /**
     * Email address for platform admin registration; must not collide with
     * existing admin emails.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain password string for registration. To be hashed securely at
     * storage.
     */
    password: string;

    /**
     * Initial account status for the admin, such as 'active', 'suspended',
     * 'pending'. Must match allowed values in business rules.
     */
    status: string;
  };

  /**
   * Admin authorization response payload; includes admin identifier and JWT
   * tokens with necessary role claims.
   */
  export type IAuthorized = {
    /** Admin user's unique ID (UUID, ai_commerce_admin.id). */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Payload to login as an admin account, supplying unique email and matching
   * password.
   */
  export type ILogin = {
    /** Email used for admin login (must match ai_commerce_admin.email). */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password for admin login (checked against password_hash on
     * file).
     */
    password: string;
  };

  /** Payload for admin session token refresh. Includes required refresh token. */
  export type IRefresh = {
    /**
     * The refresh token to renew the session. This will be validated
     * against session data.
     */
    refreshToken: string;
  };
}
