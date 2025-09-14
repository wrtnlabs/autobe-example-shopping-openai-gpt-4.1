import { IPage } from "./IPage";
import { IAiCommerceSellerDispute } from "./IAiCommerceSellerDispute";

export namespace IPageIAiCommerceSellerDispute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceSellerDispute.ISummary[];
  };
}
