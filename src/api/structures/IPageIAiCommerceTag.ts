import { IPage } from "./IPage";
import { IAiCommerceTag } from "./IAiCommerceTag";

export namespace IPageIAiCommerceTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceTag.ISummary[];
  };
}
