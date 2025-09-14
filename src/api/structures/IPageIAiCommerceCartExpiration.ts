import { IPage } from "./IPage";
import { IAiCommerceCartExpiration } from "./IAiCommerceCartExpiration";

export namespace IPageIAiCommerceCartExpiration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCartExpiration.ISummary[];
  };
}
