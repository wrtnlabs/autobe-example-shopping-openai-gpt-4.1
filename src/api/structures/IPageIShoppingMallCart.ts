import { IPage } from "./IPage";
import { IShoppingMallCart } from "./IShoppingMallCart";

export namespace IPageIShoppingMallCart {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCart.ISummary[];
  };
}
