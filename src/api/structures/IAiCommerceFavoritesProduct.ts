import { tags } from "typia";

export namespace IAiCommerceFavoritesProduct {
  /**
   * Request body for searching or filtering a user's favorites products list,
   * supporting search, sort, and pagination.
   */
  export type IRequest = {
    /** Page number for pagination (1-based). Optional. */
    page?: (number & tags.Type<"int32">) | undefined;

    /** Number of items per page for pagination. Optional. */
    limit?: (number & tags.Type<"int32">) | undefined;

    /** Field name to sort by (e.g., 'created_at', 'label'). Optional. */
    sort?: string | undefined;

    /**
     * Sort order for results, either ascending ('asc') or descending
     * ('desc'). Optional.
     */
    order?: "asc" | "desc" | undefined;

    /** Filter: Only favorite records associated with this product UUID. */
    product_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter: Only favorites with this user-assigned label (exact match).
     * Optional.
     */
    label?: string | undefined;

    /**
     * Filter: Restrict results to favorites in a particular folder (UUID).
     * Optional.
     */
    folder_id?: (string & tags.Format<"uuid">) | undefined;

    /** Filter: Start date for created_at timestamp (inclusive). */
    created_from?: (string & tags.Format<"date-time">) | undefined;

    /** Filter: End date for created_at timestamp (inclusive). */
    created_to?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary information about a favorited product (for list display),
   * includes product, label, folder association, and snapshot reference.
   */
  export type ISummary = {
    /** Unique identifier for the product favorite record (UUID). */
    id: string & tags.Format<"uuid">;

    /** ID of the favorited product (UUID). */
    product_id: string & tags.Format<"uuid">;

    /**
     * User-assigned label for this favorite (optional, may be null if
     * unset).
     */
    label?: string | null | undefined;

    /** Folder assigned to this favorite (UUID), for organization (optional). */
    folder_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** ID of the product snapshot associated at time of favoriting (UUID). */
    snapshot_id: string & tags.Format<"uuid">;

    /** Timestamp when the favorite was added. */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the favorite was last modified. */
    updated_at: string & tags.Format<"date-time">;
  };
}
