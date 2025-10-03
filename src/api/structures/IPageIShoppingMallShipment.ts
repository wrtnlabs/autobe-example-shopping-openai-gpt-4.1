import { IPage } from "./IPage";
import { IShoppingMallShipment } from "./IShoppingMallShipment";

export namespace IPageIShoppingMallShipment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShipment.ISummary[];
  };
}
