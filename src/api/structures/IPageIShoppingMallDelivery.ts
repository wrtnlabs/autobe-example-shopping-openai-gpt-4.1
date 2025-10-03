import { IPage } from "./IPage";
import { IShoppingMallDelivery } from "./IShoppingMallDelivery";

export namespace IPageIShoppingMallDelivery {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDelivery.ISummary[];
  };
}
