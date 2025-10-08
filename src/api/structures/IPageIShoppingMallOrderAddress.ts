import { IPage } from "./IPage";
import { IShoppingMallOrderAddress } from "./IShoppingMallOrderAddress";

export namespace IPageIShoppingMallOrderAddress {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderAddress.ISummary[];
  };
}
