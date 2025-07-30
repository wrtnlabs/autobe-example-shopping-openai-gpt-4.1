import { IPage } from "./IPage";
import { IAimallBackendCustomer } from "./IAimallBackendCustomer";

export namespace IPageIAimallBackendCustomer {
  /** Paginated result of customer summary objects for list/search endpoints. */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IAimallBackendCustomer.ISummary[];
  };
}
