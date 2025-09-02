import { IPage } from "./IPage";
import { IShoppingMallAiBackendCart } from "./IShoppingMallAiBackendCart";

export namespace IPageIShoppingMallAiBackendCart {
  /**
   * A paginated collection of customer shopping cart summaries for UI paging
   * and backoffice listings following the standard IPage structure.
   */
  export type ISummary = {
    /** Pagination information for the current page of results. */
    pagination: IPage.IPagination;

    /**
     * A page of summarized shopping cart entries, as defined by
     * IShoppingMallAiBackendCart.ISummary.
     */
    data: IShoppingMallAiBackendCart.ISummary[];
  };
}
