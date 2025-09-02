import { IPage } from "./IPage";
import { IShoppingMallAiBackendDepositTransaction } from "./IShoppingMallAiBackendDepositTransaction";

export namespace IPageIShoppingMallAiBackendDepositTransaction {
  /**
   * Paginated summary of deposit transactions, with essential identifying
   * information only for list or search view.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IShoppingMallAiBackendDepositTransaction.ISummary[];
  };
}
