import { IPage } from "./IPage";
import { IAiCommerceCategoryTemplate } from "./IAiCommerceCategoryTemplate";

export namespace IPageIAiCommerceCategoryTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCategoryTemplate.ISummary[];
  };
}
