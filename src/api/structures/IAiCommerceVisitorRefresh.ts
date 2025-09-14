import { tags } from "typia";

export namespace IAiCommerceVisitorRefresh {
  /**
   * Request body to refresh a visitor (guest) session. Requires refresh token
   * and visitor UUID.
   */
  export type ICreate = {
    /** The visitor's refresh token. Must match an active session. */
    refreshToken: string;

    /** The visitor ID to validate the refresh context (UUID). */
    visitorId: string & tags.Format<"uuid">;
  };
}
