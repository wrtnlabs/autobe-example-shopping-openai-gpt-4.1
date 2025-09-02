import { IPage } from "./IPage";
import { IShoppingMallAiBackendFavoriteFolder } from "./IShoppingMallAiBackendFavoriteFolder";

export namespace IPageIShoppingMallAiBackendFavoriteFolder {
  /** Paginated container for retrieving favorite folder summaries. */
  export type ISummary = {
    /** Pagination information for this page of favorite folders. */
    pagination: IPage.IPagination;

    /** Array of favorite folder summary records for this result page. */
    data: IShoppingMallAiBackendFavoriteFolder.ISummary[];
  };
}
