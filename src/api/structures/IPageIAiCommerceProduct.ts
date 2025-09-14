import { IPage } from "./IPage";
import { IAiCommerceProduct } from "./IAiCommerceProduct";

export namespace IPageIAiCommerceProduct {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceProduct.ISummary[];
  };
}
