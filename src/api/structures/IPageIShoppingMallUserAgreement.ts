import { IPage } from "./IPage";
import { IShoppingMallUserAgreement } from "./IShoppingMallUserAgreement";

export namespace IPageIShoppingMallUserAgreement {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallUserAgreement.ISummary[];
  };
}
