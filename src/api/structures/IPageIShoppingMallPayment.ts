import { IPage } from "./IPage";
import { IShoppingMallPayment } from "./IShoppingMallPayment";

export namespace IPageIShoppingMallPayment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPayment.ISummary[];
  };
}
