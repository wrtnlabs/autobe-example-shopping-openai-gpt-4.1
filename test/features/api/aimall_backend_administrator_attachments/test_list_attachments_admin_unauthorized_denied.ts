import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate denial of unauthorized access to the administrator attachment list
 * endpoint.
 *
 * Business context: The /aimall-backend/administrator/attachments endpoint
 * exposes potentially privacy-sensitive attachment metadata. Only administrator
 * (or properly authenticated) users should be permitted access. Unauthorized
 * users must never receive attachment lists or records via this route.
 *
 * Steps:
 *
 * 1. Attempt to invoke the endpoint without administrator authentication using an
 *    unauthenticated connection object.
 * 2. Assert that the API call throws a forbidden (403) or unauthorized (401) error
 *    (i.e., any error—do not attempt to pattern-match the error message).
 * 3. Assert that no attachment data is returned if error is thrown (i.e., error is
 *    thrown pre-result).
 * 4. If the call erroneously succeeds, the test must fail, as this is a
 *    significant security issue.
 */
export async function test_api_aimall_backend_administrator_attachments_test_list_attachments_admin_unauthorized_denied(
  connection: api.IConnection,
) {
  // 1. Attempt to fetch attachments as an unauthorized (not admin) user
  await TestValidator.error(
    "unauthorized or forbidden access to administrator attachments must be denied",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.index(
      connection,
    );
  });
  // 2. Done; error must have occurred and no data must be exposed.
}
