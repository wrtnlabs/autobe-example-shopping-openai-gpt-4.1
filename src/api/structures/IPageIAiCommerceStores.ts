import { IPage } from "./IPage";
import { IAiCommerceStores } from "./IAiCommerceStores";

export namespace IPageIAiCommerceStores {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceStores.ISummary[];
  };
}
