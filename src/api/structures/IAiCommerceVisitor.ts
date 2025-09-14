import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IAiCommerceVisitor {
  /**
   * Response body for an authorized visitor session, including all issued
   * tokens and session context.
   */
  export type IAuthorized = {
    /** Unique identifier for the authorized visitor session (UUID). */
    visitorId: string & tags.Format<"uuid">;

    /** JWT access token for temporary member/visitor usage. */
    accessToken: string;

    /** JWT refresh token for session renewal. */
    refreshToken: string;

    /**
     * The current status of the visitor session (e.g., 'active',
     * 'converted', 'expired').
     */
    status: string;

    /** Optional. Expiry or onboarding status for evidence/compliance. */
    expiresAt?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
