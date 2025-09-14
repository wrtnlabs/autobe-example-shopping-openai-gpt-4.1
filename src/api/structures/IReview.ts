import { tags } from "typia";

export namespace IReview {
  /**
   * Request DTO for updating an existing review. All fields optional; partial
   * update supported. SECURITY: Must never allow author_id, order_item_id,
   * status, or audit/system fields to be changed by user request. Must not
   * accept password/system sensitive data.
   */
  export type IUpdate = {
    /** Updated numeric rating, if changed. Optional. */
    rating?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      | undefined;

    /** Updated review content, if changed. */
    body?: string | undefined;

    /** Updated review visibility, if changed. */
    visibility?: string | undefined;

    /**
     * Only updatable by the seller; ignored otherwise. Represents seller
     * communication to the review.
     */
    seller_response?: string | undefined;
  };
}
