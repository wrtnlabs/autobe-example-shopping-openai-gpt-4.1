import { IPage } from "./IPage";
import { IAiCommerceSellerOnboarding } from "./IAiCommerceSellerOnboarding";

export namespace IPageIAiCommerceSellerOnboarding {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceSellerOnboarding.ISummary[];
  };
}
