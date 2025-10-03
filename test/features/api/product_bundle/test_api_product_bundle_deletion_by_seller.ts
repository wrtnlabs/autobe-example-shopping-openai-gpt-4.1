import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate soft-deletion of a product bundle by an authenticated seller.
 *
 * 1. Admin creates channel
 * 2. Admin creates section
 * 3. Admin creates category
 * 4. Seller registers for channel/section
 * 5. Admin creates product for seller/channel/section/category
 * 6. Admin creates a product bundle
 * 7. Seller (authenticated) deletes the bundle
 * 8. Validate no type or flow errors, all dependencies maintained.
 */
export async function test_api_product_bundle_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin creates channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // Step 2: Admin creates section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5).toLowerCase(),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // Step 3: Admin creates category for channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(5).toLowerCase(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 4: Seller registers
  const sellerEmail =
    RandomGenerator.alphaNumeric(12).toLowerCase() + "@test.com";
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(2),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);

  // Step 5: Admin creates product
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.name(2),
    status: "active",
    business_status: "pending-activation",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Step 6: Admin creates product bundle
  const bundleBody = {
    shopping_mall_product_id: product.id,
    name: RandomGenerator.name(3),
    bundle_type: RandomGenerator.pick(["fixed", "optional"] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    position: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductBundle.ICreate;
  const bundle: IShoppingMallProductBundle =
    await api.functional.shoppingMall.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleBody,
      },
    );
  typia.assert(bundle);

  // Step 7: Seller deletes (soft-deletes) the bundle
  await api.functional.shoppingMall.seller.products.bundles.erase(connection, {
    productId: product.id,
    bundleId: bundle.id,
  });
}
