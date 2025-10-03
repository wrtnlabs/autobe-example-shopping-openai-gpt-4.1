import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSeoMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSeoMetadata";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate SEO metadata retrieval for a seller-owned product.
 *
 * This test covers the following workflow:
 *
 * 1. Admin creates a new channel, section, and category for product association
 * 2. Seller registers via join endpoint with channel and section
 * 3. Seller registers a product under the created channel, section, and category
 * 4. Seller sets SEO metadata (meta_title, meta_description, meta_keywords) for
 *    that product
 * 5. Seller retrieves the product SEO metadata using the seller endpoint
 * 6. Validates that the retrieved SEO metadata matches what was set
 * 7. (Negative case) Attempt retrieval by a different seller to confirm access is
 *    forbidden
 */
export async function test_api_product_seo_metadata_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin creates channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelCreate,
    },
  );
  typia.assert(channel);

  // Step 2: Admin creates section in the new channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);

  // Step 3: Admin creates category in the new channel
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // Step 4: Seller joins and authenticates
  const sellerEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const sellerJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuth);

  // Step 5: Seller registers a product in the system
  const productCreate = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Draft",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // Step 6: Seller sets SEO metadata for product
  const seoUpdate = {
    meta_title: RandomGenerator.paragraph({ sentences: 1 }),
    meta_description: RandomGenerator.paragraph({ sentences: 2 }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallProductSeoMetadata.IUpdate;
  const seoSet = await api.functional.shoppingMall.seller.products.seo.update(
    connection,
    {
      productId: product.id,
      body: seoUpdate,
    },
  );
  typia.assert(seoSet);

  // Step 7: Seller retrieves product SEO metadata
  const seoGet = await api.functional.shoppingMall.seller.products.seo.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(seoGet);
  TestValidator.equals(
    "SEO meta_title matches",
    seoGet.meta_title,
    seoUpdate.meta_title,
  );
  TestValidator.equals(
    "SEO meta_description matches",
    seoGet.meta_description,
    seoUpdate.meta_description,
  );
  TestValidator.equals(
    "SEO meta_keywords matches",
    seoGet.meta_keywords,
    seoUpdate.meta_keywords,
  );

  // Step 8: Negative case - other seller cannot retrieve SEO metadata
  // Register another seller on the same channel/section for isolation
  const otherSellerEmail = `${RandomGenerator.alphaNumeric(10)}@other.com`;
  const otherSellerJoin = {
    email: otherSellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const otherSellerAuth = await api.functional.auth.seller.join(connection, {
    body: otherSellerJoin,
  });
  typia.assert(otherSellerAuth);

  // Try as other seller to access the first seller's product SEO metadata
  await TestValidator.error(
    "Another seller is forbidden from accessing product SEO metadata",
    async () => {
      await api.functional.shoppingMall.seller.products.seo.at(connection, {
        productId: product.id,
      });
    },
  );
}
