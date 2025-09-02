import { IPage } from "./IPage";
import { IShoppingMallAiBackendAdminAuditLog } from "./IShoppingMallAiBackendAdminAuditLog";

export namespace IPageIShoppingMallAiBackendAdminAuditLog {
  /** Paginated, filtered summary page of admin audit log records. */
  export type ISummary = {
    /** Paging info */
    pagination: IPage.IPagination;

    /** Audit log summary records */
    data: IShoppingMallAiBackendAdminAuditLog.ISummary[];
  };
}
