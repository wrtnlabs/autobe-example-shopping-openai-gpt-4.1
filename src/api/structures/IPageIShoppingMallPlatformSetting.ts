import { IPage } from "./IPage";
import { IShoppingMallPlatformSetting } from "./IShoppingMallPlatformSetting";

export namespace IPageIShoppingMallPlatformSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPlatformSetting.ISummary[];
  };
}
