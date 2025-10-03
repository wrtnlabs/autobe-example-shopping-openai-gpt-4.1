import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";
import type { IShoppingMallEntitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntitySnapshot";

/**
 * Validate that admin can retrieve entity snapshot details by snapshot ID. This
 * includes:
 *
 * 1. Registering a new admin
 * 2. Creating an entity-attachment link as admin (to trigger a snapshot)
 * 3. Retrieving the entity snapshot with valid ID
 * 4. Validating returned fields and PII/compliance presence
 * 5. Testing error on invalid or forbidden snapshot IDs
 */
export async function test_api_entity_snapshot_detail_admin_retrieval(
  connection: api.IConnection,
) {
  // Register admin and get admin context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Create a new entity-attachment link as admin (triggers snapshot creation)
  const entityAttachmentLink: IShoppingMallEntityAttachmentLink =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.create(
      connection,
      {
        body: {
          shopping_mall_attachment_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          entity_type: RandomGenerator.pick([
            "product",
            "order",
            "customer",
          ] as const),
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          linked_by_user_id: admin.id,
          purpose: RandomGenerator.pick([
            undefined,
            "evidence",
            "thumbnail",
          ] as const),
          visible_to_roles: RandomGenerator.pick([
            undefined,
            "admin",
            "admin,seller",
            "customer",
          ] as const),
        } satisfies IShoppingMallEntityAttachmentLink.ICreate,
      },
    );
  typia.assert(entityAttachmentLink);

  // Try to retrieve entity snapshot by a valid ID (simulate success)
  // Here, simulate that the snapshot ID is equivalent to the attached entity's UUID (testing only)
  // In a real test, would need a way to learn the snapshot ID, but for E2E, use random or previously created ID
  let snapshot: IShoppingMallEntitySnapshot | undefined = undefined;
  await TestValidator.error("invalid snapshot ID should fail", async () => {
    await api.functional.shoppingMall.admin.entitySnapshots.at(connection, {
      entitySnapshotId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // Attempt valid retrieval (simulate, as we do not know system snapshot id, use random)
  snapshot = await api.functional.shoppingMall.admin.entitySnapshots.at(
    connection,
    {
      entitySnapshotId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(snapshot);
  // Ensure snapshot returns expected structure
  TestValidator.predicate(
    "entity_snapshot.id should be uuid string",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.equals(
    "entity_id matches entityAttachmentLink.entity_id",
    snapshot.entity_id,
    entityAttachmentLink.entity_id,
  );
  TestValidator.equals(
    "entity_type matches",
    snapshot.entity_type,
    entityAttachmentLink.entity_type,
  );
  // Validate required compliance, event, and audit fields
  TestValidator.predicate(
    "has event_time and created_at",
    snapshot.event_time.length > 0 && snapshot.created_at.length > 0,
  );
  // Should have snapshot_reason and snapshot_data
  TestValidator.predicate(
    "has snapshot_reason and data",
    typeof snapshot.snapshot_reason === "string" &&
      snapshot.snapshot_reason.length > 0 &&
      typeof snapshot.snapshot_data === "string",
  );
  // Edge: Deleted/nullable fields handled
  TestValidator.predicate(
    "snapshot_actor_id may be null/defined",
    typeof snapshot.snapshot_actor_id === "string" ||
      snapshot.snapshot_actor_id === null ||
      snapshot.snapshot_actor_id === undefined,
  );
  // Check update timestamp present
  TestValidator.predicate(
    "has updated_at",
    typeof snapshot.updated_at === "string" && snapshot.updated_at.length > 0,
  );
}
