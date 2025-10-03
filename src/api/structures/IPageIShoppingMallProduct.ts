import { IPage } from "./IPage";
import { IShoppingMallProduct } from "./IShoppingMallProduct";

export namespace IPageIShoppingMallProduct {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProduct.ISummary[];
  };
}
