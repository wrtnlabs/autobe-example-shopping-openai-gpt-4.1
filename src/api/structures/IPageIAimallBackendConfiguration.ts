import { IPage } from "./IPage";
import { IAimallBackendConfiguration } from "./IAimallBackendConfiguration";

export namespace IPageIAimallBackendConfiguration {
  /**
   * Paginated result type for configuration summaries.
   *
   * Contains metadata and an array of configuration summary objects as
   * returned from filtering or list endpoints.
   */
  export type ISummary = {
    /**
     * Pagination metadata for configuration summary result page.
     *
     * Contains current page, items per page, total records, total pages,
     * supporting efficient frontend navigation.
     *
     * See IPage.IPagination standard type for details.
     */
    pagination: IPage.IPagination;

    /**
     * Array of configuration summary records for the current result page.
     *
     * Each entry summarizes a configuration entity.
     */
    data: IAimallBackendConfiguration.ISummary[];
  };
}
