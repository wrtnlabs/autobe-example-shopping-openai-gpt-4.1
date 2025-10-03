import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test for detailed retrieval of a product attachment link by seller.
 *
 * 1. Register a new channel (admin)
 * 2. Register a section within the channel (admin)
 * 3. Register a category in that channel (admin)
 * 4. Seller joins using the above channel/section (auth)
 * 5. Seller creates a product assigned to the channel/section/category (seller)
 * 6. Upload an attachment (admin)
 * 7. Link the attachment to the product (admin)
 * 8. Seller fetches its product attachment metadata using the detail endpoint
 * 9. Validate that metadata matches and correct linkage is shown
 * 10. Error: Try to fetch a non-existent attachment link
 * 11. Error: Try to fetch with mismatched productId/attachmentLinkId
 *
 * Edge cases are tested for permission and existence validation.
 */
export async function test_api_product_attachment_link_detail_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 2. Register a section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(section);

  // 3. Register a category for the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(category);

  // 4. Seller join
  const sellerEmail = RandomGenerator.alphaNumeric(8) + "@e2e.test";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password",
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      kyc_status: "pending",
    },
  });
  typia.assert(seller);

  // 5. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      },
    },
  );
  typia.assert(product);

  // 6. Upload an attachment
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    {
      body: {
        filename: RandomGenerator.alphaNumeric(12) + ".jpg",
        file_extension: "jpg",
        mime_type: "image/jpeg",
        size_bytes: 1024,
        server_url:
          "https://cdn.example.com/" + RandomGenerator.alphaNumeric(16),
        public_accessible: false,
        permission_scope: "seller",
        logical_source: "product-image",
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(attachment);

  // 7. Link attachment to product
  const link =
    await api.functional.shoppingMall.admin.products.attachments.create(
      connection,
      {
        productId: product.id,
        body: {
          attachment_id: attachment.id,
          purpose: "main_image",
          position: 0,
        },
      },
    );
  typia.assert(link);

  // 8. Seller fetches the product attachment link by detail endpoint
  const detail =
    await api.functional.shoppingMall.seller.products.attachments.at(
      connection,
      {
        productId: product.id,
        attachmentLinkId: link.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "attachment link matches registration",
    detail.id,
    link.id,
  );
  TestValidator.equals(
    "product relation correct",
    detail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "attachment relation correct",
    detail.attachment_id,
    attachment.id,
  );
  TestValidator.equals("purpose matches", detail.purpose, link.purpose);
  TestValidator.equals("position matches", detail.position, link.position);
  if (detail.product)
    TestValidator.equals(
      "product embedded matches",
      detail.product.id,
      product.id,
    );
  if (detail.attachment)
    TestValidator.equals(
      "attachment embedded matches",
      detail.attachment.id,
      attachment.id,
    );

  // 9. Error: fetch with non-existent attachmentLinkId
  await TestValidator.error(
    "seller cannot fetch non-existent attachment link",
    async () => {
      await api.functional.shoppingMall.seller.products.attachments.at(
        connection,
        {
          productId: product.id,
          attachmentLinkId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 10. Error: fetch existing link with mismatched productId
  const anotherProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      },
    });
  typia.assert(anotherProduct);
  await TestValidator.error(
    "fetching link with wrong productId fails",
    async () => {
      await api.functional.shoppingMall.seller.products.attachments.at(
        connection,
        {
          productId: anotherProduct.id,
          attachmentLinkId: link.id,
        },
      );
    },
  );
}
