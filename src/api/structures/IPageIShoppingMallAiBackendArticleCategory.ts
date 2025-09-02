import { IPage } from "./IPage";
import { IShoppingMallAiBackendArticleCategory } from "./IShoppingMallAiBackendArticleCategory";

export namespace IPageIShoppingMallAiBackendArticleCategory {
  /**
   * Paginated response type for retrieving a filtered/searchable list of
   * article category summaries. Uses standard pagination and summary entity
   * conventions for business UIs.
   */
  export type ISummary = {
    /**
     * Pagination information, including current page, page size, and total
     * records.
     */
    pagination: IPage.IPagination;

    /**
     * Array of summary article category items for paginated search/list
     * response.
     */
    data: IShoppingMallAiBackendArticleCategory.ISummary[];
  };
}
