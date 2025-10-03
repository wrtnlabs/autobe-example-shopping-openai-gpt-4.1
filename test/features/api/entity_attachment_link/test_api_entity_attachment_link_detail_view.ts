import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";

/**
 * Validate the detail retrieval workflow for an entity-attachment link
 * (entityAttachmentLinkId) in the shopping mall backend. Covers creation and
 * full-detail retrieval after admin authentication.
 *
 * Steps:
 *
 * 1. Register a new admin account (with random email and name)
 * 2. Create a new entity-attachment link as that admin, using random IDs,
 *    realistic entity_type, entity_id, shopping_mall_attachment_id, and all
 *    optional fields (purpose and visible_to_roles) with valid values
 * 3. Retrieve the entity-attachment link detail by its ID using GET (should
 *    succeed with authenticated admin)
 * 4. Validate all major DTO properties: id fields, foreign keys, context, audit
 *    trail fields, and optional fields (including purpose, visible_to_roles,
 *    created_at, deleted_at)
 * 5. Ensure the returned detail matches the creation values and schema
 * 6. (NO negative/unauthed case in this suite—test success/positive only)
 */
export async function test_api_entity_attachment_link_detail_view(
  connection: api.IConnection,
) {
  // 1. Register a new admin (random credentials)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a new entity-attachment link (randomized values as admin)
  const createBody = {
    shopping_mall_attachment_id: typia.random<string & tags.Format<"uuid">>(),
    entity_type: RandomGenerator.pick([
      "product",
      "order",
      "review",
      "promotion",
      "complaint",
      "coupon",
    ] as const),
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    linked_by_user_id: admin.id,
    purpose: RandomGenerator.pick([
      "evidence",
      "thumbnail",
      "document",
      "invoice",
      undefined,
    ] as const),
    visible_to_roles: RandomGenerator.pick([
      "admin",
      "admin,seller",
      "admin,seller,customer",
      undefined,
    ] as const),
  } satisfies IShoppingMallEntityAttachmentLink.ICreate;
  const link =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.create(
      connection,
      { body: createBody },
    );
  typia.assert(link);

  // 3. Retrieve the detail info by entityAttachmentLinkId (should succeed)
  const detail = await api.functional.shoppingMall.entityAttachmentLinks.at(
    connection,
    { entityAttachmentLinkId: link.id },
  );
  typia.assert(detail);

  // 4. Validate all major fields and value integrity
  TestValidator.equals("entity-attachment link ID matches", detail.id, link.id);
  TestValidator.equals(
    "attachment ID matches",
    detail.shopping_mall_attachment_id,
    createBody.shopping_mall_attachment_id,
  );
  TestValidator.equals(
    "entity type matches",
    detail.entity_type,
    createBody.entity_type,
  );
  TestValidator.equals(
    "entity ID matches",
    detail.entity_id,
    createBody.entity_id,
  );
  TestValidator.equals(
    "linked_by_user_id matches admin",
    detail.linked_by_user_id,
    admin.id,
  );
  TestValidator.equals(
    "purpose matches",
    detail.purpose,
    createBody.purpose ?? undefined,
  );
  TestValidator.equals(
    "visible_to_roles matches",
    detail.visible_to_roles,
    createBody.visible_to_roles ?? undefined,
  );
  TestValidator.predicate(
    "created_at is present and valid ISO",
    typeof detail.created_at === "string" &&
      detail.created_at.length >= 20 &&
      !isNaN(Date.parse(detail.created_at)),
  );
  // deleted_at is optional/nullable
  if (detail.deleted_at !== undefined && detail.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at (if present) is valid ISO",
      typeof detail.deleted_at === "string" &&
        detail.deleted_at.length >= 20 &&
        !isNaN(Date.parse(detail.deleted_at)),
    );
  }
}
