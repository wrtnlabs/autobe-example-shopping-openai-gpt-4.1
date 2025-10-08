import { IPage } from "./IPage";
import { IShoppingMallOrderItem } from "./IShoppingMallOrderItem";

export namespace IPageIShoppingMallOrderItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderItem.ISummary[];
  };
}
