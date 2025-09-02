import { IPage } from "./IPage";
import { IShoppingMallAiBackendCustomer } from "./IShoppingMallAiBackendCustomer";

export namespace IPageIShoppingMallAiBackendCustomer {
  /** Paginated list of customer summaries, matches IPage* structure. */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IShoppingMallAiBackendCustomer.ISummary[];
  };
}
