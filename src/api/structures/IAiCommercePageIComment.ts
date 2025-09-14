import { tags } from "typia";

import { IAiCommerceComment } from "./IAiCommerceComment";

export namespace IAiCommercePageIComment {
  /**
   * Paginated summary result for comment lists. Contains a data array of
   * comment summaries, total count, pagination, and page limits.
   */
  export type ISummary = {
    /** Total number of comment summary items returned by the pagination. */
    total: number & tags.Type<"int32">;

    /** The current page number (1-based index). */
    page: number & tags.Type<"int32">;

    /** The number of items per page. */
    limit: number & tags.Type<"int32">;

    /** Array of comment summary objects on this page. */
    data: IAiCommerceComment.ISummary[];
  };
}
