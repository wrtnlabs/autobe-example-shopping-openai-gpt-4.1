import { IPage } from "./IPage";
import { IShoppingMallProductInquiry } from "./IShoppingMallProductInquiry";

export namespace IPageIShoppingMallProductInquiry {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductInquiry.ISummary[];
  };
}
