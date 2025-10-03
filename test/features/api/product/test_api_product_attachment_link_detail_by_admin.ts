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
 * Validates admin access to detailed product attachment link information.
 *
 * Ensures all prerequisites for product and attachment entities are established
 * through admin flows. Validates the following:
 *
 * 1. Admin join authentication and context establishment
 * 2. Channel creation
 * 3. Section and category creation scoped to channel
 * 4. Product registration in that channel/section/category
 * 5. Attachment file upload with metadata
 * 6. Attachment link creation to associate file with product
 * 7. Admin fetches attachment link details by product/attachmentLinkId, asserting
 *    all referenced metadata (purpose, position, attached file, secure URI,
 *    etc.)
 * 8. Error validation for non-existent product ID and/or link ID (ensuring proper
 *    error for bad lookup via TestValidator.error)
 */
export async function test_api_product_attachment_link_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Channel creation
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Section creation
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 0,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  // 4. Category creation
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 0,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);

  // 5. Product registration
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    status: "Draft",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 6. Attachment file upload
  const attachmentBody = {
    filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_extension: "jpg",
    mime_type: "image/jpeg",
    size_bytes: 102400,
    server_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.jpg`,
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "product-image",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    { body: attachmentBody },
  );
  typia.assert(attachment);

  // 7. Link attachment to product
  const linkBody = {
    attachment_id: attachment.id,
    purpose: "main_image",
    position: 0,
  } satisfies IShoppingMallProductAttachmentLink.ICreate;
  const link =
    await api.functional.shoppingMall.admin.products.attachments.create(
      connection,
      { productId: product.id, body: linkBody },
    );
  typia.assert(link);

  // 8. Admin fetches attachment link details
  const linkDetail =
    await api.functional.shoppingMall.admin.products.attachments.at(
      connection,
      { productId: product.id, attachmentLinkId: link.id },
    );
  typia.assert(linkDetail);
  TestValidator.equals("attachment link id matches", linkDetail.id, link.id);
  TestValidator.equals(
    "product id",
    linkDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "attachment id",
    linkDetail.attachment_id,
    attachment.id,
  );
  TestValidator.equals("purpose", linkDetail.purpose, linkBody.purpose);
  TestValidator.equals("position", linkDetail.position, linkBody.position);
  TestValidator.predicate(
    "embedded product ref (if any) matches id",
    !linkDetail.product || linkDetail.product.id === product.id,
  );
  TestValidator.predicate(
    "embedded attachment ref (if any) matches id",
    !linkDetail.attachment || linkDetail.attachment.id === attachment.id,
  );

  // 9. Negative test: non-existent product/attachmentLinkId
  const badProductId = typia.random<string & tags.Format<"uuid">>();
  const badAttachmentLinkId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("error for non-existent productId", async () => {
    await api.functional.shoppingMall.admin.products.attachments.at(
      connection,
      { productId: badProductId, attachmentLinkId: link.id },
    );
  });
  await TestValidator.error(
    "error for non-existent attachmentLinkId",
    async () => {
      await api.functional.shoppingMall.admin.products.attachments.at(
        connection,
        { productId: product.id, attachmentLinkId: badAttachmentLinkId },
      );
    },
  );
}
