import { IPage } from "./IPage";
import { IShoppingMallAiBackendChannelSection } from "./IShoppingMallAiBackendChannelSection";

export namespace IPageIShoppingMallAiBackendChannelSection {
  /**
   * Paged result for listing channel sections, with strongly typed section
   * summaries and full pagination context. Used for admin and UI
   * listing/search endpoints.
   */
  export type ISummary = {
    /** Detailed pagination structure for this page of channel sections. */
    pagination: IPage.IPagination;

    /** Paged records for channel section summaries. */
    data: IShoppingMallAiBackendChannelSection.ISummary[];
  };
}
