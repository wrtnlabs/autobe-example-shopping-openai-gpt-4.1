import { IPage } from "./IPage";
import { IShoppingMallAiBackendFavoriteInquiry } from "./IShoppingMallAiBackendFavoriteInquiry";

export namespace IPageIShoppingMallAiBackendFavoriteInquiry {
  /**
   * Paginated response for favorited inquiry summary records. Used for
   * favorites folder contents in profile/dashboard. Follows IPage<T> with
   * data[] as array of ISummary.
   */
  export type ISummary = {
    /** Pagination object, with page, limit, count, and page count. */
    pagination: IPage.IPagination;

    /** Array of summary objects for customer-favorited inquiries. */
    data: IShoppingMallAiBackendFavoriteInquiry.ISummary[];
  };
}
