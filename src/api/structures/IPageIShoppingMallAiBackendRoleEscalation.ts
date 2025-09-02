import { IPage } from "./IPage";
import { IShoppingMallAiBackendRoleEscalation } from "./IShoppingMallAiBackendRoleEscalation";

export namespace IPageIShoppingMallAiBackendRoleEscalation {
  /**
   * Paginated summary page of role escalation events for the shopping mall
   * platform.
   */
  export type ISummary = {
    /** Paging info */
    pagination: IPage.IPagination;

    /** List of role escalation event summaries */
    data: IShoppingMallAiBackendRoleEscalation.ISummary[];
  };
}
