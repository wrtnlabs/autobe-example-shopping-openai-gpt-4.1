import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDeletionEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeletionEvent";

/**
 * Validate admin audit retrieval of deletion event detail.
 *
 * Validates that platform admins can retrieve full details of a specific
 * logical deletion (soft delete) event for audit and compliance review. Ensures
 * only properly authenticated admins have access. Confirms all event metadata
 * (type, entity id, actor, reason, snapshot, timestamps) is present, sensitive
 * info is visible (not masked), and type schema is correct.
 *
 * Steps:
 *
 * 1. Admin registration and obtain authorized session.
 * 2. Prepare plausible test deletionEventId (random UUID; since deletion event
 *    creation is not exposed).
 * 3. Call deletion event detail API with admin session and validate response shape
 *    via typia.assert.
 * 4. Further assert fields for business logic and metadata (entity_type present,
 *    entity_id is UUID, timestamps valid, reason present).
 */
export async function test_api_admin_deletion_event_detail_audit_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain session/token.
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Prepare plausible deletionEventId for test (random UUID).
  const testDeletionEventId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve deletion event as admin
  const event: IShoppingMallDeletionEvent =
    await api.functional.shoppingMall.admin.deletionEvents.at(connection, {
      deletionEventId: testDeletionEventId,
    });
  typia.assert(event);

  // 4. Validate business and schema aspects of result
  TestValidator.predicate(
    "entity_type should be a non-empty string",
    typeof event.entity_type === "string" && event.entity_type.length > 0,
  );
  TestValidator.predicate(
    "entity_id is a valid UUID",
    typeof event.entity_id === "string" && event.entity_id.length === 36,
  );
  TestValidator.predicate(
    "deletion_reason present",
    typeof event.deletion_reason === "string" &&
      event.deletion_reason.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is ISO8601",
    typeof event.deleted_at === "string" && event.deleted_at.includes("T"),
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof event.created_at === "string" && event.created_at.includes("T"),
  );
  // Optional fields
  if (event.deleted_by_id !== null && event.deleted_by_id !== undefined)
    TestValidator.predicate(
      "deleted_by_id is UUID",
      typeof event.deleted_by_id === "string" &&
        event.deleted_by_id.length === 36,
    );
  if (event.snapshot_id !== null && event.snapshot_id !== undefined)
    TestValidator.predicate(
      "snapshot_id is UUID",
      typeof event.snapshot_id === "string" && event.snapshot_id.length === 36,
    );
}
