import { IPage } from "./IPage";
import { IShoppingMallAiBackendProductBundle } from "./IShoppingMallAiBackendProductBundle";

export namespace IPageIShoppingMallAiBackendProductBundle {
  /** Paginated result for searched bundles (SKU variants) of a product. */
  export type ISummary = {
    /** Paginated results metadata. */
    pagination: IPage.IPagination;

    /** Array of summary product bundle (variant) records. */
    data: IShoppingMallAiBackendProductBundle.ISummary[];
  };
}
