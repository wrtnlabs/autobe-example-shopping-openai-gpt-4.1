import { IPage } from "./IPage";
import { IShoppingMallAdminActionLog } from "./IShoppingMallAdminActionLog";

export namespace IPageIShoppingMallAdminActionLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminActionLog.ISummary[];
  };
}
