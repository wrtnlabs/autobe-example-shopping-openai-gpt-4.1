import { IPage } from "./IPage";
import { IShoppingMallExternalAccount } from "./IShoppingMallExternalAccount";

export namespace IPageIShoppingMallExternalAccount {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallExternalAccount.ISummary[];
  };
}
