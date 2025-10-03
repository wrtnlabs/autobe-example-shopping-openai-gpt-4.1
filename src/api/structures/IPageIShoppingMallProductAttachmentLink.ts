import { IPage } from "./IPage";
import { IShoppingMallProductAttachmentLink } from "./IShoppingMallProductAttachmentLink";

export namespace IPageIShoppingMallProductAttachmentLink {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductAttachmentLink.ISummary[];
  };
}
