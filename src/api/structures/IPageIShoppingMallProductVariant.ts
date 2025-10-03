import { IPage } from "./IPage";
import { IShoppingMallProductVariant } from "./IShoppingMallProductVariant";

export namespace IPageIShoppingMallProductVariant {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductVariant.ISummary[];
  };
}
