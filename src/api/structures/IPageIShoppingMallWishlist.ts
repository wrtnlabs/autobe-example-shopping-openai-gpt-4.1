import { IPage } from "./IPage";
import { IShoppingMallWishlist } from "./IShoppingMallWishlist";

export namespace IPageIShoppingMallWishlist {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlist.ISummary[];
  };
}
