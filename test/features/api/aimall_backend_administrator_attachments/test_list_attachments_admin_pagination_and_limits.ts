import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate pagination and limits on admin attachment listing.
 *
 * This test ensures that the GET /aimall-backend/administrator/attachments
 * endpoint for administrators supports pagination properly and that page
 * boundaries, total counts, and page size limits are enforced.
 *
 * Prerequisite: Admin account must be registered (to simulate an authenticated
 * listing request).
 *
 * Workflow:
 *
 * 1. Register a test administrator account to use for authentication.
 * 2. As admin, call the attachments list endpoint to fetch the first page (using
 *    default pagination parameters if available).
 * 3. Call the endpoint again to fetch the second page (if API supports page param;
 *    otherwise, skip).
 * 4. Use a custom page size; verify boundaries and counts (skip if not supported).
 * 5. Attempt excessive page size (skip if not supported).
 * 6. For each page, validate there is no duplication of attachment ids within
 *    page.
 * 7. Ensure total count reported in pagination metadata is correct and consistent
 *    between requests.
 *
 * This test does not require uploading or creating attachments, as it focuses
 * on the correctness of pagination behaviors and metadata. The dataset may be
 * empty, in which case logic must still gracefully pass with zero records.
 */
export async function test_api_aimall_backend_administrator_attachments_test_list_attachments_admin_pagination_and_limits(
  connection: api.IConnection,
) {
  // 1. Register a test administrator account (required for authenticated listing)
  const adminInput: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    status: "active",
  };
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: adminInput },
    );
  typia.assert(admin);

  // 2. Fetch first page of attachments (default server page size since no params allowed)
  const page1 =
    await api.functional.aimall_backend.administrator.attachments.index(
      connection,
    );
  typia.assert(page1);
  TestValidator.predicate("pagination metadata present")(!!page1.pagination);
  TestValidator.predicate("pagination current page is 1")(
    page1.pagination.current === 1,
  );

  // Data and ID uniqueness within the page
  const page1Ids = page1.data.map((a) => a.id);
  TestValidator.predicate("IDs are unique in page1")(
    new Set(page1Ids).size === page1Ids.length,
  );

  // Since API does not accept page/limit params, skip steps for subsequent/custom pages or limit checks

  // Total record count: if records fit in a single page, count matches; else, test that .records >= .data.length
  TestValidator.predicate("total record count >= data length")(
    page1.pagination.records >= page1.data.length,
  );
}
