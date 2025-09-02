import { IPage } from "./IPage";
import { IShoppingMallAiBackendCoupon } from "./IShoppingMallAiBackendCoupon";

export namespace IPageIShoppingMallAiBackendCoupon {
  /** Paginated page of coupon summary records. */
  export type ISummary = {
    /** Pagination info */
    pagination: IPage.IPagination;

    /** List of coupon summary records on this page */
    data: IShoppingMallAiBackendCoupon.ISummary[];
  };
}
