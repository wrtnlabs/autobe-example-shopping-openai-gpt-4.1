import { IPage } from "./IPage";
import { IAiCommerceFavoritesAddress } from "./IAiCommerceFavoritesAddress";

export namespace IPageIAiCommerceFavoritesAddress {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceFavoritesAddress.ISummary[];
  };
}
