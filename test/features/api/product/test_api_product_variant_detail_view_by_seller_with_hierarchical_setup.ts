import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates product variant detail view for seller with setup of
 * channel/section/category. The scenario establishes full hierarchy (admin,
 * channel, section, category), then registers seller, product, and variant. It
 * finally asserts the seller's ability to retrieve the SKU detail, enforces
 * access restriction for unrelated sellers/IDs, and validates the business
 * structure integrity.
 */
export async function test_api_product_variant_detail_view_by_seller_with_hierarchical_setup(
  connection: api.IConnection,
) {
  // 1. Admin registration/login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Channel creation by admin
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 3. Section creation by admin
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Category creation by admin
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 5. Seller registration for created channel/section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 6. Product registration by seller
  const productInput = {
    shopping_mall_seller_id: sellerJoin.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    status: "active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 7. SKU (variant) creation under the product
  const skuInput = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(12),
    option_values_hash: RandomGenerator.alphaNumeric(24),
    price: 19900,
    stock_quantity: typia.random<number & tags.Type<"int32">>(),
    weight: 1,
  } satisfies IShoppingMallProductVariant.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.variants.create(
    connection,
    {
      productId: product.id,
      body: skuInput,
    },
  );
  typia.assert(sku);

  // 8. Seller retrieves their own variant (success)
  const variant = await api.functional.shoppingMall.seller.products.variants.at(
    connection,
    {
      productId: product.id,
      variantId: sku.id,
    },
  );
  typia.assert(variant);
  TestValidator.equals(
    "retrieved variant SKU matches input",
    variant.sku_code,
    sku.sku_code,
  );
  TestValidator.equals(
    "retrieved variant product relation",
    variant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "retrieved variant price matches input",
    variant.price,
    sku.price,
  );

  // 9. Register an unrelated seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "SellerAnother!",
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSellerJoin);

  // 10. Switch to other seller and attempt variant retrieval (expect error)
  await TestValidator.error(
    "unrelated seller cannot retrieve variant detail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        connection,
        {
          productId: product.id,
          variantId: sku.id,
        },
      );
    },
  );

  // 11. Try access with invalid productId or variantId (expect error)
  await TestValidator.error(
    "invalid productId returns business error",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: sku.id,
        },
      );
    },
  );
  await TestValidator.error(
    "invalid variantId returns business error",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        connection,
        {
          productId: product.id,
          variantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
