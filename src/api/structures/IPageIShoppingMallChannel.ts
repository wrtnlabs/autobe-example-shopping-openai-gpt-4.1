import { IPage } from "./IPage";
import { IShoppingMallChannel } from "./IShoppingMallChannel";

export namespace IPageIShoppingMallChannel {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallChannel.ISummary[];
  };
}
