import { IPage } from "./IPage";
import { IShoppingMallAiBackendFavoriteProduct } from "./IShoppingMallAiBackendFavoriteProduct";

export namespace IPageIShoppingMallAiBackendFavoriteProduct {
  /** Paginated response type for batches of favorited product summary records. */
  export type ISummary = {
    /** Paging object. */
    pagination: IPage.IPagination;

    /** List of favorited product summary records for the requested page. */
    data: IShoppingMallAiBackendFavoriteProduct.ISummary[];
  };
}
