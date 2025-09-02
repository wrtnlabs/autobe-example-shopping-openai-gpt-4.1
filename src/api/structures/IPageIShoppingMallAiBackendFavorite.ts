import { IPage } from "./IPage";
import { IShoppingMallAiBackendFavorite } from "./IShoppingMallAiBackendFavorite";

export namespace IPageIShoppingMallAiBackendFavorite {
  /**
   * Paginated results of summarized favorites for listing UI and search with
   * meta info.
   */
  export type ISummary = {
    /** Pagination information for a page of favorites. */
    pagination: IPage.IPagination;

    /** Array of summarized favorite records for the page. */
    data: IShoppingMallAiBackendFavorite.ISummary[];
  };
}
