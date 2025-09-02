import { IPage } from "./IPage";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "./IShoppingMallAiBackendCustomerExternalIdentity";

export namespace IPageIShoppingMallAiBackendCustomerExternalIdentity {
  /** Paginated summary of customer external identity links. */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IShoppingMallAiBackendCustomerExternalIdentity.ISummary[];
  };
}
