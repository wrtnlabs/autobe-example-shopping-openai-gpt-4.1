import { IPage } from "./IPage";
import { IShoppingMallOrderPaymentMethod } from "./IShoppingMallOrderPaymentMethod";

export namespace IPageIShoppingMallOrderPaymentMethod {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderPaymentMethod.ISummary[];
  };
}
