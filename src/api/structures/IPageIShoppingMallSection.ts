import { IPage } from "./IPage";
import { IShoppingMallSection } from "./IShoppingMallSection";

export namespace IPageIShoppingMallSection {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSection.ISummary[];
  };
}
