import { IPage } from "./IPage";
import { IShoppingMallAiBackendAdmin } from "./IShoppingMallAiBackendAdmin";

export namespace IPageIShoppingMallAiBackendAdmin {
  /** Paginated summary list of admin search results. */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** Array of summarized admin records. */
    data: IShoppingMallAiBackendAdmin.ISummary[];
  };
}
