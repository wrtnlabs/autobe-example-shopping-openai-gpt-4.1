import { IPage } from "./IPage";
import { IShoppingMallCouponCampaign } from "./IShoppingMallCouponCampaign";

export namespace IPageIShoppingMallCouponCampaign {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCouponCampaign.ISummary[];
  };
}
