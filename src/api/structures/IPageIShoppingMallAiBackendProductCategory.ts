import { IPage } from "./IPage";
import { IShoppingMallAiBackendProductCategory } from "./IShoppingMallAiBackendProductCategory";

export namespace IPageIShoppingMallAiBackendProductCategory {
  /** Paginated summary set of product category records. */
  export type ISummary = {
    /** Pagination metadata for the page of results. */
    pagination: IPage.IPagination;

    /**
     * Array of product category objects matching the search criteria for
     * this page.
     */
    data: IShoppingMallAiBackendProductCategory[];
  };
}
