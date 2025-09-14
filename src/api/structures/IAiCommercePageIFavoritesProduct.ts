import { tags } from "typia";

import { IAiCommerceFavoritesProduct } from "./IAiCommerceFavoritesProduct";

export namespace IAiCommercePageIFavoritesProduct {
  /**
   * Paginated summary result for user's product favorites search; includes
   * total, paging, and an array of summary favorite product entries.
   */
  export type ISummary = {
    /** Total number of favorite product summary items returned. */
    total: number & tags.Type<"int32">;

    /** The current page number (1-based index). */
    page: number & tags.Type<"int32">;

    /** The number of items per page (pagination). */
    limit: number & tags.Type<"int32">;

    /** Array of favorite product summary records for this page. */
    data: IAiCommerceFavoritesProduct.ISummary[];
  };
}
