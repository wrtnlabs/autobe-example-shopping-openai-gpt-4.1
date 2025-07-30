import { IPage } from "./IPage";
import { IAimallBackendAdministrator } from "./IAimallBackendAdministrator";

export namespace IPageIAimallBackendAdministrator {
  /** Paginated summary list of administrators (for admin dashboard or audit) */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IAimallBackendAdministrator.ISummary[];
  };
}
