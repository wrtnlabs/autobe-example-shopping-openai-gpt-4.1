import { IPage_IPagination } from "./IPage_IPagination";
import { IShoppingMallAiBackendMileageTransaction } from "./IShoppingMallAiBackendMileageTransaction";

export namespace IPageIShoppingMallAiBackendMileageTransaction {
  /**
   * Paginated array for summary view of mileage transaction history,
   * typically for user, seller, or admin dashboard and audit review.
   */
  export type ISummary = {
    /** Pagination and total record information for this summary page. */
    pagination: IPage_IPagination;

    /** Current page subset of mileage transaction summary entries. */
    data: IShoppingMallAiBackendMileageTransaction.ISummaryItem[];
  };
}
