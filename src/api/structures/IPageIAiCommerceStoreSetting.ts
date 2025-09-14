import { IPage } from "./IPage";
import { IAiCommerceStoreSetting } from "./IAiCommerceStoreSetting";

export namespace IPageIAiCommerceStoreSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceStoreSetting.ISummary[];
  };
}
