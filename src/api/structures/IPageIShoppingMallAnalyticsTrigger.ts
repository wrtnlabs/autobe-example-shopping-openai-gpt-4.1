import { IPage } from "./IPage";
import { IShoppingMallAnalyticsTrigger } from "./IShoppingMallAnalyticsTrigger";

export namespace IPageIShoppingMallAnalyticsTrigger {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAnalyticsTrigger.ISummary[];
  };
}
