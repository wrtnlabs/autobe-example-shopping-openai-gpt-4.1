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
 * Validate seller workflow for linking product attachments
 *
 * Test the entire flow for a seller to successfully link an uploaded attachment
 * to a product, and verify duplicate-prevention and referential/business logic
 * constraints.
 *
 * Steps:
 *
 * 1. Create a channel (admin)
 * 2. Create a section in the channel (admin)
 * 3. Create a category in the channel (admin)
 * 4. Register a seller and switch to seller account (join authentication, with the
 *    channel and section created above)
 * 5. Seller creates a product in that channel/section/category
 * 6. Upload an attachment file (admin endpoint)
 * 7. Seller attaches the file to the product (purpose: 'main_image', position: 0)
 * 8. Verify that attachment link is created and references the correct product,
 *    attachment, purpose, and position
 * 9. Attempt to attach the same attachment for the same purpose again to the
 *    product—expect an error (duplicate prevention)
 */
export async function test_api_product_attachment_link_create_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a channel (admin)
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

  // 2. Create a section (admin)
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 0,
        },
      },
    );
  typia.assert(section);

  // 3. Create a category (admin)
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
          display_order: 0,
        },
      },
    );
  typia.assert(category);

  // 4. Register a seller (join)
  const email = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
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
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Draft",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. Upload an attachment (admin)
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    {
      body: {
        filename: `${RandomGenerator.alphaNumeric(6)}.jpg`,
        file_extension: "jpg",
        mime_type: "image/jpeg",
        size_bytes: 1024,
        server_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(12)}`,
        public_accessible: true,
        permission_scope: "seller",
        logical_source: "product",
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(attachment);

  // 7. Seller links attachment to product
  const linkPurpose = "main_image";
  const linkPosition = 0;
  const link =
    await api.functional.shoppingMall.seller.products.attachments.create(
      connection,
      {
        productId: product.id,
        body: {
          attachment_id: attachment.id,
          purpose: linkPurpose,
          position: linkPosition,
        },
      },
    );
  typia.assert(link);
  // Validate correct reference
  TestValidator.equals(
    "linked product ID matches",
    link.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "linked attachment ID matches",
    link.attachment_id,
    attachment.id,
  );
  TestValidator.equals("purpose matches", link.purpose, linkPurpose);
  TestValidator.equals("position matches", link.position, linkPosition);

  // 8. Attempt to create the same attachment link for the same (purpose, position)
  await TestValidator.error("duplicate link must fail", async () => {
    await api.functional.shoppingMall.seller.products.attachments.create(
      connection,
      {
        productId: product.id,
        body: {
          attachment_id: attachment.id,
          purpose: linkPurpose,
          position: linkPosition,
        },
      },
    );
  });
}
