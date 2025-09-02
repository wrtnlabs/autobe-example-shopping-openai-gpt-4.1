import { IPage } from "./IPage";
import { IShoppingMallAiBackendCodebookEntry } from "./IShoppingMallAiBackendCodebookEntry";

export namespace IPageIShoppingMallAiBackendCodebookEntry {
  /**
   * Paginated result set for codebook entry search/display. 'data' holds
   * array of summary entries for the requested page. Used in admin/result
   * UI.
   */
  export type ISummary = {
    /**
     * Pagination state details for current page/result. Includes
     * current/total page, record counts.
     */
    pagination: IPage.IPagination;

    /** Paged result array of codebook entry summary records. */
    data: IShoppingMallAiBackendCodebookEntry.ISummary[];
  };
}
