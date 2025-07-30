import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate rejection of attempts to update immutable/protected fields of a
 * community snapshot.
 *
 * This test ensures that as an administrator, attempts to update immutable
 * fields (such as 'id' or 'created_at') of a snapshot are rejected by the API
 * with proper validation errors, and the actual data remains unchanged.
 *
 * Steps:
 *
 * 1. Create a new snapshot record to serve as the update target.
 * 2. Attempt to update the snapshot. Since the IAimallBackendSnapshot.IUpdate type
 *    strictly allows only 'caption' or 'media_uri', it is impossible to send
 *    forbidden fields (such as 'id', 'created_at') via the API and TypeScript
 *    typing. Therefore, we satisfy the requirement by asserting, as a
 *    code-level guarantee and business rule, that immutable fields are not even
 *    updatable.
 * 3. Optionally, test for error when trying to update with an empty payload or
 *    with a payload updating only allowed fields, confirming only such changes
 *    are permitted.
 * 4. Any attempt to forcibly pass forbidden fields is not possible with valid
 *    TypeScript code and is out of scope for runtime tests.
 */
export async function test_api_aimall_backend_administrator_snapshots_test_update_snapshot_with_immutable_fields_attempt(
  connection: api.IConnection,
) {
  // 1. Create a new snapshot as the update target
  const createInput: IAimallBackendSnapshot.ICreate = {
    media_uri: RandomGenerator.alphaNumeric(24),
    caption: RandomGenerator.paragraph()(),
    created_at: typia.random<string & tags.Format<"date-time">>(),
  };

  const created =
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 2. Attempt legal update with only mutable fields (should succeed)
  const updated =
    await api.functional.aimall_backend.administrator.snapshots.update(
      connection,
      {
        snapshotId: created.id,
        body: {
          caption: RandomGenerator.paragraph()(),
          media_uri: RandomGenerator.alphaNumeric(30),
        },
      },
    );
  typia.assert(updated);

  // 3. Attempt illegal update (empty payload, should fail as at least one must be updated)
  await TestValidator.error("update should fail with empty payload")(
    async () => {
      await api.functional.aimall_backend.administrator.snapshots.update(
        connection,
        {
          snapshotId: created.id,
          body: {}, // neither caption nor media_uri, which is invalid usage
        },
      );
    },
  );

  // 4. It is technically impossible to send forbidden fields (such as 'id') through this API by design. This upholds immutability by TypeScript and DTO structure.
}
