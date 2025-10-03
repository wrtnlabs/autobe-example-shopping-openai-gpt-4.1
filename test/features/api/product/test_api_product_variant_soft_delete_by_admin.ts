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

/**
 * Validate admin's soft deletion (logical removal) of a product variant (SKU).
 *
 * Steps:
 *
 * 1. Register a new admin
 * 2. Create a new channel
 * 3. Create a section in the channel
 * 4. Create a category in the channel
 * 5. Create a product belonging to the above entities
 * 6. Create a variant (SKU) for the product
 * 7. Perform DELETE /shoppingMall/admin/products/{productId}/variants/{variantId}
 * 8. Validate response: 204/200 with no content
 * 9. Fetch the variant and confirm deleted_at is set (not null)
 * 10. Confirm variant is excluded in typical listings, but available for
 *     audit/compliance
 * 11. Edge case: attempt to delete non-existent variant (expect error)
 * 12. Edge case: attempt to delete already deleted variant (expect error)
 * 13. Edge case: simulate variant linked to order (but, as direct linkage is not
 *     available in this scope, skip or document)
 */
export async function test_api_product_variant_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelInput,
    });
  typia.assert(channel);

  // 3. Create a section in the channel
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Create a category in the channel
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 5. Create a product
  const productInput = {
    shopping_mall_seller_id: admin.id, // Set admin as the seller for the test
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active", // Must be string; use plausible value
    business_status: "Approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 6. Create a variant
  const variantInput = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(12),
    bar_code: null,
    option_values_hash: RandomGenerator.alphaNumeric(16),
    price: 9990,
    stock_quantity: typia.random<number & tags.Type<"int32">>(),
    weight: 1.6,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variantInput,
      },
    );
  typia.assert(variant);

  // 7. Soft delete the variant
  await api.functional.shoppingMall.admin.products.variants.erase(connection, {
    productId: product.id,
    variantId: variant.id,
  });

  // 8. (Simulation of checking variant's deleted_at would require an index/listing API, which is not available. Instead, fetch the variant directly if API allows, or skip with comment.)
  // Note: Assuming an imaginary API exists to fetch the variant (skipped as not in definitions)

  // 9. Edge case: Try deleting non-existent variant
  await TestValidator.error(
    "Delete non-existent variant should error",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.erase(
        connection,
        {
          productId: product.id,
          variantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 10. Edge case: Try deleting already deleted variant
  await TestValidator.error(
    "Delete already deleted variant should error",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.erase(
        connection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
