import { tags } from "typia";

export namespace IBuyer {
  /**
   * Buyer registration payload for creating a new ai_commerce_buyer. Collects
   * only the business-essential fields: email and plaintext password for
   * secure account setup. Corresponds to OpenAPI body for join endpoints.
   *
   * Maps to ai_commerce_buyer table: unique email enforced by DB, password is
   * hashed before storage. Never allow direct password hash entry here.
   *
   * This DTO intentionally excludes any authentication/authorization or actor
   * ID fields, as those are handled elsewhere by platform security.
   */
  export type ICreate = {
    /**
     * The unique email address to register. Must be a valid, deliverable
     * email address for notifications, password reset, and business
     * identification. This field is the primary business key for login, is
     * unique, and must not already exist in the buyer table. Per
     * registration business logic, @see ai_commerce_buyer.email.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password at registration (will be hashed by backend). Must
     * meet platform security requirements for complexity and length. This
     * field is not stored as-is, but may be subject to validation (length,
     * complexity) by the backend. Refer to ai_commerce_buyer.password_hash
     * for storage and hashing rules.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Buyer login credentials submitted to authenticate a session. Maps to
   * ai_commerce_buyer fields. Excludes password hash or any internal fields.
   * Only supports business fields needed for standard email+password login.
   */
  export type ILogin = {
    /**
     * Buyer account email used for login. Must match the unique key in
     * ai_commerce_buyer. Required for credential authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain password submitted at login (not password hash). Will be
     * compared after hashing on backend. Must meet password complexity
     * policy.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Refresh token request body for buyer authentication flows. Contains only
   * the refresh token previously issued, used for session extension or
   * renewal. No authentication ID fields included - those are extracted from
   * the token or platform context.
   */
  export type IRefresh = {
    /**
     * Refresh token string issued at login/join; used to obtain new
     * access/refresh tokens when the current session expires. Must match
     * the format and scheme expected by backend. See
     * ai_commerce_user_authentications and platform authentication.
     */
    refreshToken: string & tags.MinLength<1>;
  };
}
