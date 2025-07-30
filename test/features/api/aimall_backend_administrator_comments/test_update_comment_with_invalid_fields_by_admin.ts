import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that attempting to update protected/immutable fields of a comment as
 * an administrator is properly rejected.
 *
 * Business context:
 *
 * - Administrators should only be able to update editable fields on a comment
 *   (body, is_private, deleted_at).
 * - Immutable fields—such as id, created_at, and any not present in the IUpdate
 *   DTO—must never be updatable by any party.
 *
 * Why this test is necessary:
 *
 * - Ensures strict compliance with audit and integrity controls.
 * - Prevents administrative overreach and preserves data correctness for
 *   regulated content.
 *
 * Step-by-step process:
 *
 * 1. As prerequisite, create a valid community comment using the customer endpoint
 *    (dependency).
 * 2. As administrator, update allowed fields (body/is_private) to verify permitted
 *    updates work.
 * 3. As administrator, attempt to update forbidden/immutable fields (e.g., id,
 *    created_at), purposely violating the DTO contract using a type unsafe cast
 *    for test purposes.
 *
 *    - This must fail with a runtime error; back-end validation should block the
 *         operation.
 * 4. (If a comment read API exists, optionally re-fetch the comment and assert
 *    that immutable fields have not changed.)
 *
 *    - If no such endpoint exists in the provided SDK, document the limitation and
 *         skip state verification.
 */
export async function test_api_aimall_backend_administrator_comments_test_update_comment_with_invalid_fields_by_admin(
  connection: api.IConnection,
) {
  // 1. Create prerequisite community comment as a customer (dependency setup)
  const createInput: IAimallBackendComment.ICreate = {
    body: "Initial body for immutability check",
    is_private: false,
  };
  const created = await api.functional.aimall_backend.customer.comments.create(
    connection,
    { body: createInput },
  );
  typia.assert(created);

  // 2. Update allowed fields as administrator (body, is_private)
  const updated =
    await api.functional.aimall_backend.administrator.comments.update(
      connection,
      {
        commentId: created.id,
        body: {
          body: "Admin may update the body",
          is_private: true,
        } satisfies IAimallBackendComment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("admin updated body")(updated.body)(
    "Admin may update the body",
  );
  TestValidator.equals("admin updated privacy")(updated.is_private)(true);

  // 3. Attempt to update forbidden/immutable fields (id, created_at, etc.).
  // This forcibly breaks DTO typing for the error-test only, as required by scenario.
  await TestValidator.error("should reject update to immutable fields")(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return api.functional.aimall_backend.administrator.comments.update(
      connection,
      {
        commentId: created.id,
        body: {
          // Forbidden fields not present in IUpdate
          id: typia.random<string & tags.Format<"uuid">>(),
          created_at: typia.random<string & tags.Format<"date-time">>(),
        } as any,
      },
    );
  });

  // 4. (Optional) Re-fetch the comment and verify protected fields unchanged.
  // No comment GET/read endpoint is present in the SDK—integrity check is skipped per technical limitation.
}
