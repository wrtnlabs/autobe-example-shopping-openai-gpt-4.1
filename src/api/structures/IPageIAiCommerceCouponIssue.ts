import { IPage } from "./IPage";
import { IAiCommerceCouponIssue } from "./IAiCommerceCouponIssue";

export namespace IPageIAiCommerceCouponIssue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceCouponIssue.ISummary[];
  };
}
