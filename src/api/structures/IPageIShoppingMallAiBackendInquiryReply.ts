import { IPage } from "./IPage";
import { IShoppingMallAiBackendInquiryReply } from "./IShoppingMallAiBackendInquiryReply";

export namespace IPageIShoppingMallAiBackendInquiryReply {
  /**
   * A page of inquiry reply summaries. Contains summary data on individual
   * replies made to inquiries in the system, supporting paginated
   * admin/customer/seller views. Pagination allows efficient retrieval of
   * large thread or ticket histories. The data array contains reply summaries
   * with evidence/audit fields. Used for dashboards, thread viewers, or audit
   * reporting. STRICTLY use named summary type for reply item type.
   */
  export type ISummary = {
    /**
     * Pagination info for this page, including current page, record count,
     * and total pages.
     */
    pagination: IPage.IPagination;

    /** Paginated array of inquiry reply summary objects. */
    data: IShoppingMallAiBackendInquiryReply.ISummary[];
  };
}
