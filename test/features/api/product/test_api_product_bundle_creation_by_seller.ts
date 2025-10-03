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
 * Validate seller creation and product bundle creation business flows.
 *
 * - Step 1: Create a channel (admin)
 * - Step 2: Create a section (admin)
 * - Step 3: Create a category (admin)
 * - Step 4: Register as a new seller in the above hierarchy
 * - Step 5: Seller creates a product in the channel/section/category
 * - Step 6: Seller posts a new bundle for the created product
 * - Step 7: Validate the bundle is correctly created and associated
 * - Step 8: Try to create a bundle with the same name again for the same product
 *   and assert error
 */
export async function test_api_product_bundle_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Create shopping mall channel
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

  // 2. Create section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  // 3. Create category in the channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);

  // 4. Register a new seller (authenticate as seller)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBody = {
    email: sellerEmail,
    password: "StrongPwd123!",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(sellerAuth);

  // 5. Seller creates a product
  const code = RandomGenerator.alphaNumeric(10);
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "Draft",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 6. Seller creates a bundle for the product
  const bundleName = RandomGenerator.paragraph({ sentences: 2 });
  const bundleBody = {
    shopping_mall_product_id: product.id,
    name: bundleName,
    bundle_type: "fixed",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    position: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductBundle.ICreate;
  const bundle =
    await api.functional.shoppingMall.seller.products.bundles.create(
      connection,
      { productId: product.id, body: bundleBody },
    );
  typia.assert(bundle);

  // 7. Validate the bundle content and linkage
  TestValidator.equals("bundle name matches", bundle.name, bundleName);
  TestValidator.equals(
    "bundle links correct product",
    bundle.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "bundle type matches",
    bundle.bundle_type,
    bundleBody.bundle_type,
  );
  TestValidator.equals(
    "bundle position matches",
    bundle.position,
    bundleBody.position,
  );
  TestValidator.equals(
    "bundle description matches",
    bundle.description,
    bundleBody.description,
  );

  // 8. Try to create a bundle with the same name for the same product (should fail)
  const duplicateBundleBody = {
    ...bundleBody,
  } satisfies IShoppingMallProductBundle.ICreate;
  await TestValidator.error(
    "duplicate bundle name for product fails",
    async () => {
      await api.functional.shoppingMall.seller.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: duplicateBundleBody,
        },
      );
    },
  );
}
