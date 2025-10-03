import { IPage } from "./IPage";
import { IShoppingMallMileage } from "./IShoppingMallMileage";

export namespace IPageIShoppingMallMileage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallMileage.ISummary[];
  };
}
