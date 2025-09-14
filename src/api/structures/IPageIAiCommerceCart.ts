import { IPage } from "./IPage";
import { IAiCommerceCart } from "./IAiCommerceCart";

export namespace IPageIAiCommerceCart {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCart.ISummary[];
  };
}
