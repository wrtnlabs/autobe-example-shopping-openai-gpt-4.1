import { IPage } from "./IPage";
import { IShoppingMallOrderHistory } from "./IShoppingMallOrderHistory";

export namespace IPageIShoppingMallOrderHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderHistory.ISummary[];
  };
}
