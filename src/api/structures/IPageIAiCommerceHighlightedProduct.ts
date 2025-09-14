import { IPage } from "./IPage";
import { IAiCommerceHighlightedProduct } from "./IAiCommerceHighlightedProduct";

export namespace IPageIAiCommerceHighlightedProduct {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceHighlightedProduct.ISummary[];
  };
}
