import { IPage } from "./IPage";
import { IAiCommerceProductBundle } from "./IAiCommerceProductBundle";

export namespace IPageIAiCommerceProductBundle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceProductBundle.ISummary[];
  };
}
