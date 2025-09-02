import { IPage } from "./IPage";
import { IShoppingMallAiBackendCodebook } from "./IShoppingMallAiBackendCodebook";

export namespace IPageIShoppingMallAiBackendCodebook {
  /** Paginated codebook result set with summaries and pagination info. */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IShoppingMallAiBackendCodebook.ISummary[];
  };
}
