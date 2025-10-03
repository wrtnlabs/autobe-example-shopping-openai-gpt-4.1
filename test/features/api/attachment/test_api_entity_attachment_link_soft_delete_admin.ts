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
 * Test that a privileged admin can soft delete (logically delete) a specific
 * entity-attachment link and that deletion is enforced at the API boundary.
 *
 * Steps:
 *
 * 1. Register and authenticate as a system admin (to get admin privileges).
 * 2. Create a product (entity) as context for linking the attachment.
 * 3. Register a file attachment.
 * 4. Create an entity-attachment link associating the attachment to the product.
 * 5. Soft-delete (logically delete) the entity-attachment link by UUID as admin.
 * 6. Attempt to delete the same link again (should fail).
 * 7. Attempt to delete as an unauthenticated user (should fail).
 * 8. Assert type and error conditions throughout.
 */
export async function test_api_entity_attachment_link_soft_delete_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Create product entity
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    status: RandomGenerator.pick([
      "Active",
      "Draft",
      "Paused",
      "Discontinued",
      "Deleted",
    ] as const),
    business_status: RandomGenerator.pick([
      "Approval",
      "Pending Activation",
      "Blocked",
      "Suspended",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create attachment
  const attachmentBody = {
    filename: RandomGenerator.alphaNumeric(8) + ".jpg",
    file_extension: "jpg",
    mime_type: "image/jpeg",
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    server_url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(32),
    public_accessible: RandomGenerator.pick([true, false] as const),
    permission_scope: RandomGenerator.pick([
      undefined,
      "admin_only",
      "public",
    ] as const),
    logical_source: RandomGenerator.pick([
      undefined,
      "product",
      "order",
      "review",
    ] as const),
    description: RandomGenerator.pick([undefined, RandomGenerator.paragraph()]),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment: IShoppingMallAttachment =
    await api.functional.shoppingMall.admin.attachments.create(connection, {
      body: attachmentBody,
    });
  typia.assert(attachment);

  // 4. Create entity-attachment link
  const entityAttachmentLinkBody = {
    shopping_mall_attachment_id: attachment.id,
    entity_type: "product",
    entity_id: product.id,
    linked_by_user_id: admin.id,
    purpose: RandomGenerator.pick([
      undefined,
      "evidence",
      "thumbnail",
    ] as const),
    visible_to_roles: RandomGenerator.pick([
      undefined,
      "admin,seller",
      "public",
    ] as const),
  } satisfies IShoppingMallEntityAttachmentLink.ICreate;
  const link: IShoppingMallEntityAttachmentLink =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.create(
      connection,
      {
        body: entityAttachmentLinkBody,
      },
    );
  typia.assert(link);

  // 5. Soft delete the entity-attachment link
  await api.functional.shoppingMall.admin.entityAttachmentLinks.erase(
    connection,
    {
      entityAttachmentLinkId: link.id,
    },
  );

  // 6. Attempt to delete again (should fail)
  await TestValidator.error(
    "Deleting an already deleted entity-attachment link must fail",
    async () => {
      await api.functional.shoppingMall.admin.entityAttachmentLinks.erase(
        connection,
        {
          entityAttachmentLinkId: link.id,
        },
      );
    },
  );

  // 7. Attempt to delete as unauthenticated (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Deleting entity-attachment link without auth must fail",
    async () => {
      await api.functional.shoppingMall.admin.entityAttachmentLinks.erase(
        unauthConn,
        {
          entityAttachmentLinkId: link.id,
        },
      );
    },
  );
}
