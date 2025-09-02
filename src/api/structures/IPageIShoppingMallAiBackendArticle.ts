import { IPage } from "./IPage";
import { IShoppingMallAiBackendArticle } from "./IShoppingMallAiBackendArticle";

export namespace IPageIShoppingMallAiBackendArticle {
  /** Paginated article summary listing for results. */
  export type ISummary = {
    /** Paging info for articles result */
    pagination: IPage.IPagination;

    /** Array of article summary data for result page */
    data: IShoppingMallAiBackendArticle.ISummary[];
  };
}
