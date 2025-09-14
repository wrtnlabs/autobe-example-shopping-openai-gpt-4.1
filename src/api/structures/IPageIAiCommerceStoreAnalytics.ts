import { IPage } from "./IPage";
import { IAiCommerceStoreAnalytics } from "./IAiCommerceStoreAnalytics";

export namespace IPageIAiCommerceStoreAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceStoreAnalytics.ISummary[];
  };
}
