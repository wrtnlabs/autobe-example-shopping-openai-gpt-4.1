import { IPage } from "./IPage";
import { IAiCommerceTrendingProduct } from "./IAiCommerceTrendingProduct";

export namespace IPageIAiCommerceTrendingProduct {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceTrendingProduct.ISummary[];
  };
}
