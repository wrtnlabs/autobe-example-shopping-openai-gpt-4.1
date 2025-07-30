import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Test the failure scenario for snapshot creation due to missing required
 * field(s).
 *
 * This test attempts to create a new community snapshot (image/video resource)
 * while intentionally omitting the required field `media_uri`, which is
 * mandatory according to the DTO schema (IAimallBackendSnapshot.ICreate). The
 * test expects the API to:
 *
 * - Detect the missing field and reject the request.
 * - Return a validation error clearly specifying the missing field (`media_uri`).
 * - Ensure that no partial or invalid snapshot record is created in the system
 *   (no side effects).
 *
 * Steps:
 *
 * 1. Construct a snapshot creation request with all required and optional fields
 *    except `media_uri` (omit it entirely).
 * 2. Call the create endpoint
 *    (`api.functional.aimall_backend.administrator.snapshots.create`).
 * 3. Assert that the call throws a validation error (and does NOT succeed).
 * 4. (If allowed by API surface) Ensure no record was created (implicit if only
 *    valid requests persist data).
 */
export async function test_api_aimall_backend_administrator_snapshots_test_create_snapshot_failure_due_to_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Prepare a snapshot creation request missing `media_uri`
  const requestBody: Omit<IAimallBackendSnapshot.ICreate, "media_uri"> = {
    // Optionally provide other valid optional fields
    product_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    caption: "Missing media_uri field",
    created_at: typia.random<string & tags.Format<"date-time">>(),
  };

  // 2. Attempt the API call and expect an error
  await TestValidator.error("missing media_uri should fail")(async () => {
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      { body: requestBody as any }, // Use 'as any' ONLY inside error test, never in typeful code
    );
  });
}
