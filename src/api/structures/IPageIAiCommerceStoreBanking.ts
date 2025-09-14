import { IPage } from "./IPage";
import { IAiCommerceStoreBanking } from "./IAiCommerceStoreBanking";

export namespace IPageIAiCommerceStoreBanking {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceStoreBanking.ISummary[];
  };
}
