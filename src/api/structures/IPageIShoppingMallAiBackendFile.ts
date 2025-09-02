import { IPage } from "./IPage";
import { IShoppingMallAiBackendFile } from "./IShoppingMallAiBackendFile";

export namespace IPageIShoppingMallAiBackendFile {
  /**
   * Paginated result schema for file metadata summary view. Includes
   * pagination info and data array.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IShoppingMallAiBackendFile.ISummary[];
  };
}
