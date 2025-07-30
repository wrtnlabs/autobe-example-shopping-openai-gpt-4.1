import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate creation of a new community snapshot as an administrator.
 *
 * This test covers the creation of a community snapshot resource via the
 * administrator endpoint with all supported fields:
 *
 * - Required: media_uri
 * - Optional: caption, product_id, post_id, customer_id, created_at
 *
 * It verifies response contains expected field values, runtime errors for
 * missing required fields, and overall contract compliance.
 *
 * Steps:
 *
 * 1. Prepare valid snapshot creation input, populating all fields with realistic
 *    data.
 * 2. Call POST /aimall-backend/administrator/snapshots as administrator.
 * 3. Verify API response reflects input atomic fields (media_uri and all optional
 *    values).
 * 4. Test error case: creating a snapshot with missing required field (media_uri)
 *    should fail at runtime.
 * 5. Note: No GET endpoint is present for round-trip readback, so only POST
 *    workflow is validated.
 */
export async function test_api_aimall_backend_administrator_snapshots_create(
  connection: api.IConnection,
) {
  // 1. Prepare input: all fields populated
  const now: string = new Date().toISOString();
  const input: IAimallBackendSnapshot.ICreate = {
    media_uri: `https://cdn.example.com/media/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    caption: "Optional community snapshot caption.",
    product_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: now,
  };

  // 2. Create snapshot via API
  const snapshot =
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      {
        body: input,
      },
    );
  typia.assert(snapshot);

  // 3. Validate response atomic fields
  TestValidator.equals("media_uri persisted")(snapshot.media_uri)(
    input.media_uri,
  );
  TestValidator.equals("caption persisted")(snapshot.caption)(input.caption);
  TestValidator.equals("product_id persisted")(snapshot.product_id)(
    input.product_id,
  );
  TestValidator.equals("post_id persisted")(snapshot.post_id)(input.post_id);
  TestValidator.equals("customer_id persisted")(snapshot.customer_id)(
    input.customer_id,
  );
  TestValidator.equals("created_at persisted")(snapshot.created_at)(
    input.created_at,
  );

  // 4. Error scenario: required field missing (media_uri)
  await TestValidator.error("missing required media_uri")(async () => {
    // media_uri is omitted as required field
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      {
        body: {
          // Intentionally omit media_uri.
          caption: "No media_uri",
          product_id: typia.random<string & tags.Format<"uuid">>(),
          post_id: typia.random<string & tags.Format<"uuid">>(),
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          created_at: now,
        } as IAimallBackendSnapshot.ICreate, // TypeScript forces as-cast for TS/JS runtime error
      },
    );
  });

  // 5. NOTE: No GET endpoint for snapshot. Skipping round-trip retrieval validation.
}
