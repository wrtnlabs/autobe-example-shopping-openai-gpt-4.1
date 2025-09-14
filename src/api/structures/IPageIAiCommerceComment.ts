import { IPage } from "./IPage";
import { IAiCommerceComment } from "./IAiCommerceComment";

export namespace IPageIAiCommerceComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceComment.ISummary[];
  };
}
