import { IPage } from "./IPage";
import { IAiCommerceSection } from "./IAiCommerceSection";

export namespace IPageIAiCommerceSection {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceSection.ISummary[];
  };
}
