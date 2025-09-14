import { IPage } from "./IPage";
import { IAiCommerceFavoritesFolder } from "./IAiCommerceFavoritesFolder";

export namespace IPageIAiCommerceFavoritesFolder {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceFavoritesFolder.ISummary[];
  };
}
