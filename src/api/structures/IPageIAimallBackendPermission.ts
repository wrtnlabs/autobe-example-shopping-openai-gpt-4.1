import { IPage } from "./IPage";
import { IAimallBackendPermission } from "./IAimallBackendPermission";

export namespace IPageIAimallBackendPermission {
  /**
   * Paginated list of permission/role summary DTOs matching filter/search in
   * RBAC management and assignment UIs. Uses standard IPage metadata.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Array of permission/role summary DTOs matching search/result set. */
    data: IAimallBackendPermission.ISummary[];
  };
}
