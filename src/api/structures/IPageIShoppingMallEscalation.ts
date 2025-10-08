import { IPage } from "./IPage";
import { IShoppingMallEscalation } from "./IShoppingMallEscalation";

export namespace IPageIShoppingMallEscalation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallEscalation.ISummary[];
  };
}
