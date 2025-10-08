import { IPage } from "./IPage";
import { IShoppingMallOrder } from "./IShoppingMallOrder";

export namespace IPageIShoppingMallOrder {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrder.ISummary[];
  };
}
