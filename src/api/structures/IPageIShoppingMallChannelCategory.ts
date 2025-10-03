import { IPage } from "./IPage";
import { IShoppingMallChannelCategory } from "./IShoppingMallChannelCategory";

export namespace IPageIShoppingMallChannelCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallChannelCategory.ISummary[];
  };
}
