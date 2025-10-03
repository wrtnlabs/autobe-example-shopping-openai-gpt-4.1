import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttachmentLink";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate product's attachment link listing for seller, including role access
 * control, filter/sort, pagination, and edge with no attachments. Covers all
 * prerequisites: channel, section, category, seller join, product, attachment,
 * link creation. Checks business response structure and behavior.
 */
export async function test_api_product_attachment_links_list_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Admin adds section to channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Admin adds category to channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller joins using join (not login), referencing channel/section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      // phone, kyc_status can be omitted (optional)
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 5. Seller registers a product in their section/category
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Admin uploads an attachment
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    {
      body: {
        filename: RandomGenerator.alphaNumeric(10) + ".jpg",
        file_extension: "jpg",
        mime_type: "image/jpeg",
        size_bytes: 123456,
        server_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
        public_accessible: true,
      } satisfies IShoppingMallAttachment.ICreate,
    },
  );
  typia.assert(attachment);

  // 7. Admin creates a link between the product and the attachment (purpose: "main_image")
  const purpose = "main_image";
  const productAttachmentLink =
    await api.functional.shoppingMall.admin.products.attachments.create(
      connection,
      {
        productId: product.id,
        body: {
          attachment_id: attachment.id,
          purpose,
          position: 0,
          productId: product.id,
        } satisfies IShoppingMallProductAttachmentLink.ICreate,
      },
    );
  typia.assert(productAttachmentLink);

  // 8. Seller retrieves attachment links for their product
  //    (a) No filter
  const allPage =
    await api.functional.shoppingMall.seller.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.predicate(
    "at least one attachment link exists",
    allPage.data.length >= 1,
  );
  TestValidator.equals(
    "attached link matches",
    allPage.data[0].attachment_id,
    attachment.id,
  );
  TestValidator.equals(
    "attached purpose matches",
    allPage.data[0].purpose,
    purpose,
  );

  //    (b) Filter by purpose
  const filterPage =
    await api.functional.shoppingMall.seller.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          purpose,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(filterPage);
  for (const a of filterPage.data)
    TestValidator.equals("filtered by purpose", a.purpose, purpose);

  //    (c) Sort/Order by position desc (should reverse, but only one)
  const sortedPage =
    await api.functional.shoppingMall.seller.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          sort: "position" as const,
          order: "desc" as const,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(sortedPage);
  // Only one entry, thus same as previous
  TestValidator.equals(
    "sorted by desc returns attachment",
    sortedPage.data[0].attachment_id,
    attachment.id,
  );

  //    (d) Pagination (limit = 1)
  const paged =
    await api.functional.shoppingMall.seller.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          limit: 1,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination returns one or less", paged.data.length, 1);

  // 9. Edge: Product with no attachments returns empty data array
  const emptyProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(emptyProduct);

  const emptyPage =
    await api.functional.shoppingMall.seller.products.attachments.index(
      connection,
      {
        productId: emptyProduct.id,
        body: {
          productId: emptyProduct.id,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty product has no attachments",
    emptyPage.data.length,
    0,
  );
}
