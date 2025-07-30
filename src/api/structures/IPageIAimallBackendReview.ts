import { IPage } from "./IPage";
import { IAimallBackendReview } from "./IAimallBackendReview";

export namespace IPageIAimallBackendReview {
  /**
   * Paged listing of review summary-type objects (for lists, admin panels,
   * analytic UIs).
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Paginated review summary records. */
    data: IAimallBackendReview.ISummary[];
  };
}
