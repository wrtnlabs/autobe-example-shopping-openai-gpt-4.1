import { IPage } from "./IPage";
import { IAiCommerceBulletin } from "./IAiCommerceBulletin";

export namespace IPageIAiCommerceBulletin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceBulletin.ISummary[];
  };
}
