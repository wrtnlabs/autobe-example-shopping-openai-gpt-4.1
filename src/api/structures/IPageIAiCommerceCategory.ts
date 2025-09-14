import { IPage } from "./IPage";
import { IAiCommerceCategory } from "./IAiCommerceCategory";

export namespace IPageIAiCommerceCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCategory.ISummary[];
  };
}
