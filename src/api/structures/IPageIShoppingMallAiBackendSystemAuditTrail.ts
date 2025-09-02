import { IPage } from "./IPage";
import { IShoppingMallAiBackendSystemAuditTrail } from "./IShoppingMallAiBackendSystemAuditTrail";

export namespace IPageIShoppingMallAiBackendSystemAuditTrail {
  /**
   * Paginated summary view of system audit trail records. Standard 'IPage'
   * container with data field containing audit trail summaries. Used for
   * admin search interfaces. Data structure: array of SystemAuditTrail
   * records.
   */
  export type ISummary = {
    /** Pagination metadata for this result set. */
    pagination: IPage.IPagination;

    /** List of audit trail summaries for the current page. */
    data: IShoppingMallAiBackendSystemAuditTrail[];
  };
}
