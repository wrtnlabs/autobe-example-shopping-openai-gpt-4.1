import { IPage } from "./IPage";
import { IShoppingMallAiBackendInquiry } from "./IShoppingMallAiBackendInquiry";

export namespace IPageIShoppingMallAiBackendInquiry {
  /**
   * Paginated summary list of inquiries according to pagination structure.
   * For search results or filtered inquiry overviews.
   */
  export type ISummary = {
    /** Paging meta information. */
    pagination: IPage.IPagination;

    /** Array of inquiry summary records for this page. */
    data: IShoppingMallAiBackendInquiry.ISummary[];
  };
}
