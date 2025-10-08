import { IPage } from "./IPage";
import { IShoppingMallAdminAuditLog } from "./IShoppingMallAdminAuditLog";

export namespace IPageIShoppingMallAdminAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminAuditLog.ISummary[];
  };
}
