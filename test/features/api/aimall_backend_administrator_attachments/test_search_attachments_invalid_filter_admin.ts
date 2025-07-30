import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling of invalid filters in the admin attachments search
 * API.
 *
 * This test ensures that the PATCH /aimall-backend/administrator/attachments
 * endpoint performs strict validation of input filters and rejects requests
 * with out-of-range values or malformed format in administrative search
 * context.
 *
 * Scenario:
 *
 * 1. Register an administrator account for context.
 * 2. Attempt to search for attachments using various invalid filter values: 2-a.
 *    Invalid (not UUID) string as post_id 2-b. Nonexistent/invalid file_type
 *    string 2-c. Out-of-range negative file_size_min value 2-d. Invalid format
 *    (not ISO8601 date) in created_from
 * 3. Confirm the API returns validation errors and does not process the request in
 *    each case.
 *
 * Each error is validated using TestValidator.error(), confirming expected
 * failure.
 */
export async function test_api_aimall_backend_administrator_attachments_test_search_attachments_invalid_filter_admin(
  connection: api.IConnection,
) {
  // 1. Register an administrator account (provides admin context)
  const administrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: typia.random<string>(),
          status: "active",
        },
      },
    );
  typia.assert(administrator);

  // 2-a. Attempt with invalid post_id (not a UUID, should trigger validation error)
  await TestValidator.error("invalid post_id triggers error")(() =>
    api.functional.aimall_backend.administrator.attachments.search(connection, {
      body: { post_id: "invalid-uuid-string" },
    }),
  );

  // 2-b. Attempt with nonexistent/invalid file_type MIME string
  await TestValidator.error("nonexistent file_type triggers error")(() =>
    api.functional.aimall_backend.administrator.attachments.search(connection, {
      body: { file_type: "magic/invalid-mime-type" },
    }),
  );

  // 2-c. Attempt with out-of-range (negative) file_size_min
  await TestValidator.error("negative file_size_min triggers error")(() =>
    api.functional.aimall_backend.administrator.attachments.search(connection, {
      body: { file_size_min: -100 },
    }),
  );

  // 2-d. Attempt with malformed ISO date string in created_from
  await TestValidator.error("invalid created_from date format triggers error")(
    () =>
      api.functional.aimall_backend.administrator.attachments.search(
        connection,
        {
          body: { created_from: "not-a-valid-date" },
        },
      ),
  );
}
