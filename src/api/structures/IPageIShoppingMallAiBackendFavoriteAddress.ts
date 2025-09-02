import { IPage } from "./IPage";
import { IShoppingMallAiBackendFavoriteAddress } from "./IShoppingMallAiBackendFavoriteAddress";

export namespace IPageIShoppingMallAiBackendFavoriteAddress {
  /**
   * Paginated response for favorited addresses summary records. Conforms to
   * IPage<T> pattern, where data contains array of address summaries. Used
   * for favorites folder contents list.
   */
  export type ISummary = {
    /**
     * Pagination information for the result set. Page, limit, record count,
     * total pages.
     */
    pagination: IPage.IPagination;

    /** Array of summary records for each favorite address. */
    data: IShoppingMallAiBackendFavoriteAddress.ISummary[];
  };
}
