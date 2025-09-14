import { IPage } from "./IPage";
import { IAiCommerceCartItem } from "./IAiCommerceCartItem";

export namespace IPageIAiCommerceCartItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCartItem.ISummary[];
  };
}
