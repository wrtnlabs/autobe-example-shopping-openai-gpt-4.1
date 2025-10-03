import { IPage } from "./IPage";
import { IShoppingMallUserConnection } from "./IShoppingMallUserConnection";

export namespace IPageIShoppingMallUserConnection {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallUserConnection.ISummary[];
  };
}
