import { IPage } from "./IPage";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IPageIShoppingMallSeller {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSeller.ISummary[];
  };
}
