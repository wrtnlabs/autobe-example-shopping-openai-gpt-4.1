import { IPage } from "./IPage";
import { IShoppingMallAiBackendDeposit } from "./IShoppingMallAiBackendDeposit";

export namespace IPageIShoppingMallAiBackendDeposit {
  /**
   * Paginated list of deposit ledger summary records, supporting finance,
   * compliance, and search reporting for user/seller balances.
   */
  export type ISummary = {
    /** Paging information for browsing large deposit sets. */
    pagination: IPage.IPagination;

    /** Array of summary deposit ledger records for response page. */
    data: IShoppingMallAiBackendDeposit.ISummary[];
  };
}
