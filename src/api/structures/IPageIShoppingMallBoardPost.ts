import { IPage } from "./IPage";
import { IShoppingMallBoardPost } from "./IShoppingMallBoardPost";

export namespace IPageIShoppingMallBoardPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallBoardPost.ISummary[];
  };
}
