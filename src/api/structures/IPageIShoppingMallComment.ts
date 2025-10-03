import { IPage } from "./IPage";
import { IShoppingMallComment } from "./IShoppingMallComment";

export namespace IPageIShoppingMallComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallComment.ISummary[];
  };
}
