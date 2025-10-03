import { IPage } from "./IPage";
import { IShoppingMallReview } from "./IShoppingMallReview";

export namespace IPageIShoppingMallReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReview.ISummary[];
  };
}
