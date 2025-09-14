import { IPage } from "./IPage";
import { IAiCommerceCoupon } from "./IAiCommerceCoupon";

export namespace IPageIAiCommerceCoupon {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCoupon.ISummary[];
  };
}
