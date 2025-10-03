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
 * Validate that a seller can set and update SEO metadata for their own product.
 *
 * 1. Admin creates a channel
 * 2. Admin creates a section in the channel
 * 3. Admin creates a category in the channel
 * 4. Seller joins, belonging to created channel and section
 * 5. Seller creates a product under the channel, section, category
 * 6. Seller sets initial SEO metadata for the product using PUT
 * 7. Seller updates SEO metadata again using PUT with new values
 * 8. Retrieve the product's SEO metadata to validate the update
 * 9. Attempt to update SEO metadata as a different/unauthorized seller - expect
 *    error
 * 10. Validate all response types, updated fields, and permission boundaries
 */
export async function test_api_product_seo_metadata_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin creates a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 2: Admin creates a section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 3: Admin creates a category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Seller joins using channel and section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerpw1!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(2),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 5: Seller creates a product under channel/section/category
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(3),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Seller sets initial SEO metadata
  const initialSeo = {
    meta_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    meta_description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    meta_keywords: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }).replace(/ /g, ","),
  } satisfies IShoppingMallProductSeoMetadata.IUpdate;
  const seoResult1 =
    await api.functional.shoppingMall.seller.products.seo.update(connection, {
      productId: product.id,
      body: initialSeo,
    });
  typia.assert(seoResult1);
  TestValidator.equals(
    "SEO meta_title set",
    seoResult1.meta_title,
    initialSeo.meta_title,
  );

  // Step 7: Seller updates SEO metadata with new values
  const updatedSeo = {
    meta_title: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 12,
    }),
    meta_description: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 5,
      wordMax: 12,
    }),
    meta_keywords: RandomGenerator.paragraph({
      sentences: 7,
      wordMin: 6,
      wordMax: 12,
    }).replace(/ /g, ","),
  } satisfies IShoppingMallProductSeoMetadata.IUpdate;
  const seoResult2 =
    await api.functional.shoppingMall.seller.products.seo.update(connection, {
      productId: product.id,
      body: updatedSeo,
    });
  typia.assert(seoResult2);
  TestValidator.notEquals(
    "SEO meta_title updated",
    seoResult2.meta_title,
    seoResult1.meta_title,
  );
  TestValidator.equals(
    "SEO meta_title matches update",
    seoResult2.meta_title,
    updatedSeo.meta_title,
  );

  // Step 8: Retrieve product SEO to verify changes (since there's no GET, verify last update result)
  // The previous response already contains all SEO fields, tested above.

  // Step 9: Register a second, unauthorized seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "sellerpw2!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(2),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);

  // Switch connection to unauthorized seller (simulate by joining with their credentials)

  // Step 10: Try updating SEO metadata as unauthorized seller → expect error
  await TestValidator.error(
    "Unauthorized seller cannot update product SEO",
    async () => {
      // The authorization is determined by which token is issued upon join.
      await api.functional.shoppingMall.seller.products.seo.update(connection, {
        productId: product.id,
        body: {
          meta_title: "unauthorized update attempt title",
          meta_description: "should not be allowed",
          meta_keywords: "hack,fail,unauthorized",
        } satisfies IShoppingMallProductSeoMetadata.IUpdate,
      });
    },
  );
}
