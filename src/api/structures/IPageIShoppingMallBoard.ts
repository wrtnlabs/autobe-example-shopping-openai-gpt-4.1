import { IPage } from "./IPage";
import { IShoppingMallBoard } from "./IShoppingMallBoard";

export namespace IPageIShoppingMallBoard {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallBoard.ISummary[];
  };
}
