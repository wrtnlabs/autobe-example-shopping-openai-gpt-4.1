import { IPage } from "./IPage";
import { IShoppingMallProductOption } from "./IShoppingMallProductOption";

export namespace IPageIShoppingMallProductOption {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductOption.ISummary[];
  };
}
