import { IPage } from "./IPage";
import { IShoppingMallAiBackendOrderItem } from "./IShoppingMallAiBackendOrderItem";

export namespace IPageIShoppingMallAiBackendOrderItem {
  /** Paginated summary view of order items as returned in search queries. */
  export type ISummary = {
    /** Pagination information */
    pagination: IPage.IPagination;

    /** List of order item summary views */
    data: IShoppingMallAiBackendOrderItem.ISummary[];
  };
}
