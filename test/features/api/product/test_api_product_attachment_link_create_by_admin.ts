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
 * Test admin workflow for linking an uploaded attachment to an existing
 * product.
 *
 * 1. Register as admin.
 * 2. Admin creates a channel.
 * 3. Admin creates a section for the channel.
 * 4. Admin creates a category for the channel.
 * 5. Admin registers a product.
 * 6. Admin uploads an attachment.
 * 7. Admin links the attachment to the product (via the API).
 * 8. Validate the created attachment link and relations.
 * 9. Try linking the same attachment at same purpose/position again and expect
 *    error.
 * 10. Try linking with non-existent product or attachment and expect error.
 */
export async function test_api_product_attachment_link_create_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
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

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Create section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // 4. Create category
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Register product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // use a random seller, since admin is not a seller
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 6. Upload attachment
  const attachmentBody = {
    filename: RandomGenerator.alphaNumeric(8) + ".jpg",
    file_extension: "jpg",
    mime_type: "image/jpeg",
    size_bytes: 123456,
    server_url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
    public_accessible: true,
    permission_scope: "admin_only",
    logical_source: "product",
    description: RandomGenerator.paragraph({ sentences: 2 }),
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
      {
        productId: product.id,
        body: linkBody,
      },
    );
  typia.assert(link);

  // 8. Validate the data
  TestValidator.equals(
    "linked product id matches",
    link.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "linked attachment id matches",
    link.attachment_id,
    attachment.id,
  );
  TestValidator.equals("link purpose matches", link.purpose, "main_image");
  TestValidator.equals("link position matches", link.position, 0);

  // 9. Try linking the same attachment with same purpose/position again and expect error
  await TestValidator.error(
    "cannot link same attachment to same product with same purpose/position twice",
    async () => {
      await api.functional.shoppingMall.admin.products.attachments.create(
        connection,
        {
          productId: product.id,
          body: linkBody,
        },
      );
    },
  );

  // 10. Try linking with non-existent product (random UUID)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot link attachment to non-existent product",
    async () => {
      await api.functional.shoppingMall.admin.products.attachments.create(
        connection,
        {
          productId: fakeId,
          body: linkBody,
        },
      );
    },
  );

  // 11. Try linking with non-existent attachment (random UUID)
  await TestValidator.error(
    "cannot link non-existent attachment to product",
    async () => {
      await api.functional.shoppingMall.admin.products.attachments.create(
        connection,
        {
          productId: product.id,
          body: {
            ...linkBody,
            attachment_id: fakeId,
          },
        },
      );
    },
  );
}
