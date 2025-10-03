import { IPage } from "./IPage";
import { IShoppingMallAdmin } from "./IShoppingMallAdmin";

export namespace IPageIShoppingMallAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdmin.ISummary[];
  };
}
