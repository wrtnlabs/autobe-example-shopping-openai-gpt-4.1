import { IPage } from "./IPage";
import { IShoppingMallReviewFlag } from "./IShoppingMallReviewFlag";

export namespace IPageIShoppingMallReviewFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewFlag.ISummary[];
  };
}
