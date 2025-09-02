import { IPage } from "./IPage";
import { IShoppingMallAiBackendFinancialIncident } from "./IShoppingMallAiBackendFinancialIncident";

export namespace IPageIShoppingMallAiBackendFinancialIncident {
  /**
   * A page containing summaries of financial incidents. Used by admin or
   * compliance staff for business and regulatory monitoring. Supports
   * pagination, sort, and summary/evidence access.
   */
  export type ISummary = {
    /** Pagination info. */
    pagination: IPage.IPagination;

    /** Array of financial incident summary objects. */
    data: IShoppingMallAiBackendFinancialIncident.ISummary[];
  };
}
