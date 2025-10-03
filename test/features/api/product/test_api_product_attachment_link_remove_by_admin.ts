import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate that an administrator can remove any link between a product and its
 * attachment.
 *
 * This test verifies:
 *
 * - Admin's authority to delete a product/attachment link
 * - The fact that only the link is removed (not the product nor the attachment)
 * - Audit/compliance requirements are respected (link removal, error on
 *   double-delete)
 *
 * Step by step:
 *
 * 1. Admin joins the system.
 * 2. Admin creates a channel.
 * 3. Admin creates a section in that channel.
 * 4. Admin creates a category in that channel.
 * 5. Admin creates a product (scoped to seller, channel, section, category).
 * 6. Admin uploads a file as an attachment (with valid metadata).
 * 7. Admin links the attachment to the product (purpose, position).
 * 8. Admin deletes the product-attachment link by DELETE API.
 * 9. Attempt to delete again (must fail with error).
 * 10. Verify the product and attachment entities still exist (if possible).
 */
export async function test_api_product_attachment_link_remove_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Admin creates a section in that channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Admin creates a category in that channel
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Admin creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Required but admin context, use random UUID
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(7),
        name: RandomGenerator.name(3),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Admin uploads an attachment
  const attachment: IShoppingMallAttachment =
    await api.functional.shoppingMall.admin.attachments.create(connection, {
      body: {
        filename: RandomGenerator.alphaNumeric(8) + ".jpg",
        file_extension: "jpg",
        mime_type: "image/jpeg",
        size_bytes: 1024,
        server_url:
          "https://cdn.example.com/auto-e2e-test/" +
          RandomGenerator.alphaNumeric(12),
        public_accessible: true,
        permission_scope: "public",
        logical_source: "product-image",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallAttachment.ICreate,
    });
  typia.assert(attachment);

  // 7. Admin links attachment to product
  const link: IShoppingMallProductAttachmentLink =
    await api.functional.shoppingMall.admin.products.attachments.create(
      connection,
      {
        productId: product.id,
        body: {
          attachment_id: attachment.id,
          purpose: "gallery",
          position: 0,
          productId: product.id,
        } satisfies IShoppingMallProductAttachmentLink.ICreate,
      },
    );
  typia.assert(link);

  // 8. Admin deletes product-attachment link
  await api.functional.shoppingMall.admin.products.attachments.erase(
    connection,
    {
      productId: product.id,
      attachmentLinkId: link.id,
    },
  );

  // 9. Try to delete the same link again (must error)
  await TestValidator.error("double deletion should cause error", async () => {
    await api.functional.shoppingMall.admin.products.attachments.erase(
      connection,
      {
        productId: product.id,
        attachmentLinkId: link.id,
      },
    );
  });

  // 10. Verify product and attachment are NOT deleted. If listing/GET existed, would assert here. (Skipped due to API limitation.)
}
