import { IPage } from "./IPage";
import { IShoppingMallDonation } from "./IShoppingMallDonation";

export namespace IPageIShoppingMallDonation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDonation.ISummary[];
  };
}
