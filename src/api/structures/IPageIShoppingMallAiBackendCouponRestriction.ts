import { IPage } from "./IPage";
import { IShoppingMallAiBackendCouponRestriction } from "./IShoppingMallAiBackendCouponRestriction";

export namespace IPageIShoppingMallAiBackendCouponRestriction {
  /**
   * Paginated response for searching coupon restrictions. Holds page info and
   * summary array.
   */
  export type ISummary = {
    /** Pagination metadata returned with the page. */
    pagination: IPage.IPagination;

    /** List of coupon restriction summary records on the current page. */
    data: IShoppingMallAiBackendCouponRestriction[];
  };
}
