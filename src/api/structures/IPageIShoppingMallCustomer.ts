import { IPage } from "./IPage";
import { IShoppingMallCustomer } from "./IShoppingMallCustomer";

export namespace IPageIShoppingMallCustomer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomer.ISummary[];
  };
}
