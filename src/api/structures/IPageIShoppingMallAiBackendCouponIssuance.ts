import { IPage } from "./IPage";
import { IShoppingMallAiBackendCouponIssuance } from "./IShoppingMallAiBackendCouponIssuance";

export namespace IPageIShoppingMallAiBackendCouponIssuance {
  /**
   * Paginated summary of coupon issuances for search listings. Contains
   * issue/usage status and primary fields. Used in admin, seller, or
   * compliance dashboards.
   */
  export type ISummary = {
    pagination?: IPage.IPagination;
    data?: IShoppingMallAiBackendCouponIssuance.ISummary[];
  };
}
