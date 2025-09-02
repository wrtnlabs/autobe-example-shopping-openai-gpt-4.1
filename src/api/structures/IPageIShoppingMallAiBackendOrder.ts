import { IPage } from "./IPage";
import { IShoppingMallAiBackendOrder } from "./IShoppingMallAiBackendOrder";

export namespace IPageIShoppingMallAiBackendOrder {
  /**
   * Paginated list of order summary records as returned for order search
   * index APIs.
   */
  export type ISummary = {
    /**
     * Paging structure for order summary list endpoints, including current
     * page, page size, record count, and total pages.
     */
    pagination: IPage.IPagination;

    /** List of summarized order entries for the requested page. */
    data: IShoppingMallAiBackendOrder.ISummary[];
  };
}
