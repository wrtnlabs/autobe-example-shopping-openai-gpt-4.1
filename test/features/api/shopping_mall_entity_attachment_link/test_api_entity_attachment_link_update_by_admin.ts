import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validates that an authenticated admin can update mutable metadata (purpose
 * and visible_to_roles) of an existing entity-attachment link while ensuring
 * immutable properties remain unchanged.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new admin to obtain token.
 * 2. Upload a new attachment as admin.
 * 3. Create a new product (entity to be linked).
 * 4. Create an entity-attachment link between the attachment and product,
 *    specifying linking admin.
 * 5. Update the link - change 'purpose' and/or 'visible_to_roles'.
 * 6. Validate that updates are reflected, immutable fields are unchanged, and type
 *    assertions pass.
 * 7. Test further updates: nullify or further change 'purpose' and/or
 *    'visible_to_roles'. Assert correct application, invariants, and audit
 *    fields (timestamps).
 *
 * Implementation uses exclusively SDK methods as given in provided imports and
 * DTOs. All random/sample data generated via typia.random or RandomGenerator,
 * using 'const' and 'satisfies' patterns.
 */
export async function test_api_entity_attachment_link_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Upload attachment
  const attachmentBody = {
    filename: RandomGenerator.alphaNumeric(10) + ".jpg",
    file_extension: "jpg",
    mime_type: "image/jpeg",
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    server_url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(20),
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "product-image",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    { body: attachmentBody },
  );
  typia.assert(attachment);

  // 3. Create product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 4. Link attachment to product entity
  const linkBody = {
    shopping_mall_attachment_id: attachment.id,
    entity_type: "product",
    entity_id: product.id,
    linked_by_user_id: admin.id,
    purpose: "evidence",
    visible_to_roles: "admin,seller",
  } satisfies IShoppingMallEntityAttachmentLink.ICreate;
  const link =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.create(
      connection,
      { body: linkBody },
    );
  typia.assert(link);

  // Save original immutable fields for later comparison
  const {
    id: linkId,
    shopping_mall_attachment_id,
    entity_type,
    entity_id,
    linked_by_user_id,
    created_at,
  } = link;
  const originalPurpose = link.purpose;
  const originalVisibleToRoles = link.visible_to_roles;

  // 5. Update: change purpose and visible_to_roles
  const updatePayload = {
    purpose: "thumbnail",
    visible_to_roles: "admin",
  } satisfies IShoppingMallEntityAttachmentLink.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.update(
      connection,
      {
        entityAttachmentLinkId: linkId,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "purpose updated",
    updated.purpose,
    updatePayload.purpose,
  );
  TestValidator.equals(
    "visible_to_roles updated",
    updated.visible_to_roles,
    updatePayload.visible_to_roles,
  );
  // Assert immutable properties didn't change
  TestValidator.equals("link id immutable", updated.id, linkId);
  TestValidator.equals(
    "attachment id immutable",
    updated.shopping_mall_attachment_id,
    shopping_mall_attachment_id,
  );
  TestValidator.equals(
    "entity_type immutable",
    updated.entity_type,
    entity_type,
  );
  TestValidator.equals("entity_id immutable", updated.entity_id, entity_id);
  TestValidator.equals(
    "linked_by_user_id immutable",
    updated.linked_by_user_id,
    linked_by_user_id,
  );
  TestValidator.equals("created_at immutable", updated.created_at, created_at);
  // 6. Update again: nullify purpose, update visible_to_roles
  const updateAgain =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.update(
      connection,
      {
        entityAttachmentLinkId: linkId,
        body: {
          purpose: undefined,
          visible_to_roles: null,
        } satisfies IShoppingMallEntityAttachmentLink.IUpdate,
      },
    );
  typia.assert(updateAgain);
  TestValidator.equals(
    "purpose unchanged",
    updateAgain.purpose,
    updated.purpose,
  );
  TestValidator.equals(
    "visible_to_roles cleared",
    updateAgain.visible_to_roles,
    null,
  );
  // 7. Update again: change only purpose
  const thirdUpdatePayload = {
    purpose: "audit",
  } satisfies IShoppingMallEntityAttachmentLink.IUpdate;
  const updateThird =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.update(
      connection,
      {
        entityAttachmentLinkId: linkId,
        body: thirdUpdatePayload,
      },
    );
  typia.assert(updateThird);
  TestValidator.equals(
    "purpose updated again",
    updateThird.purpose,
    thirdUpdatePayload.purpose,
  );
  TestValidator.equals(
    "visible_to_roles stays null",
    updateThird.visible_to_roles,
    updateAgain.visible_to_roles,
  );
  // Final invariant: none of the immutable fields changed
  TestValidator.equals("id invariant", updateThird.id, linkId);
  TestValidator.equals(
    "attachment_id invariant",
    updateThird.shopping_mall_attachment_id,
    shopping_mall_attachment_id,
  );
  TestValidator.equals(
    "entity_type invariant",
    updateThird.entity_type,
    entity_type,
  );
  TestValidator.equals("entity_id invariant", updateThird.entity_id, entity_id);
  TestValidator.equals(
    "linked_by_user_id invariant",
    updateThird.linked_by_user_id,
    linked_by_user_id,
  );
  TestValidator.equals(
    "created_at invariant",
    updateThird.created_at,
    created_at,
  );
}
