import { IPage } from "./IPage";
import { IShoppingMallAiBackendCouponNotification } from "./IShoppingMallAiBackendCouponNotification";

export namespace IPageIShoppingMallAiBackendCouponNotification {
  /**
   * Paginated collection of coupon notification summary objects matching
   * query. Used for admin and marketing reporting, evidence trace, or
   * analytics UI for campaign effectiveness and operational delivery
   * monitoring.
   */
  export type ISummary = {
    /** Pagination information for paged response. */
    pagination: IPage.IPagination;

    /** Array of summary notification objects matching search criteria. */
    data: IShoppingMallAiBackendCouponNotification.ISummary[];
  };
}
