import { IPage } from "./IPage";
import { IShoppingMallDeposit } from "./IShoppingMallDeposit";

export namespace IPageIShoppingMallDeposit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDeposit.ISummary[];
  };
}
