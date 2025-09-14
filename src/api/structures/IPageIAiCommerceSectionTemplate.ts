import { IPage } from "./IPage";
import { IAiCommerceSectionTemplate } from "./IAiCommerceSectionTemplate";

export namespace IPageIAiCommerceSectionTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceSectionTemplate.ISummary[];
  };
}
