import { IPage } from "./IPage";
import { IAiCommerceFavoritesInquiries } from "./IAiCommerceFavoritesInquiries";

export namespace IPageIAiCommerceFavoritesInquiries {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceFavoritesInquiries.ISummary[];
  };
}
