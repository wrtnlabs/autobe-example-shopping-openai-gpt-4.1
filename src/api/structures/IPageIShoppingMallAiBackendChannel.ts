import { IPage } from "./IPage";
import { IShoppingMallAiBackendChannel } from "./IShoppingMallAiBackendChannel";

export namespace IPageIShoppingMallAiBackendChannel {
  /** Paginated container for list/index result of channels. */
  export type ISummary = {
    /** Pagination context for result. */
    pagination: IPage.IPagination;

    /** Paged result set of channel summary records. */
    data: IShoppingMallAiBackendChannel.ISummary[];
  };
}
