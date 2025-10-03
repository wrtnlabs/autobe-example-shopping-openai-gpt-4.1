import { IPage } from "./IPage";
import { IShoppingMallProductTag } from "./IShoppingMallProductTag";

export namespace IPageIShoppingMallProductTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductTag.ISummary[];
  };
}
