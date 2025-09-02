import { IPage } from "./IPage";
import { IShoppingMallAiBackendArticleComment } from "./IShoppingMallAiBackendArticleComment";

export namespace IPageIShoppingMallAiBackendArticleComment {
  /**
   * Paginated page object for comment summaries following IPage<T> standard.
   * Always contains both pagination and data (array of comment summaries).
   */
  export type ISummary = {
    /** Pagination information for this page of comment summaries. */
    pagination: IPage.IPagination;

    /** Array of comment summary records displayed on this page. */
    data: IShoppingMallAiBackendArticleComment.ISummary[];
  };
}
