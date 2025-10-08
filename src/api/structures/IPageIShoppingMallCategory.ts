import { IPage } from "./IPage";
import { IShoppingMallCategory } from "./IShoppingMallCategory";

export namespace IPageIShoppingMallCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCategory.ISummary[];
  };
}
