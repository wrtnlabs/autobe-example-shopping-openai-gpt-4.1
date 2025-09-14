import { IPage } from "./IPage";
import { IAiCommerceProductImage } from "./IAiCommerceProductImage";

export namespace IPageIAiCommerceProductImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceProductImage.ISummary[];
  };
}
