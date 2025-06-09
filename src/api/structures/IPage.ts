import { tags } from "typia";

export namespace IPage {
  /**
   * Page information used in all API list/search responses with pagination.
   * This is the standard metadata for pagination according to requirements
   * documentation. Pattern: matches IPage.IPagination standard in the AI
   * Shopping Mall Backend API and platform-wide OpenAPI conventions.
   */
  export type IPagination = {
    /** Current page number for search/list result. */
    current: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "int32";
      }>;

    /** Requested page size (records per page). */
    limit: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "int32";
      }>;

    /** Total number of records in the list query (regardless of page/size). */
    records: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "int32";
      }>;

    /** Total number of pages, calculated from records/limit. */
    pages: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "int32";
      }>;
  };
}
