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
 * Admin can update product variants (SKUs) with proper permissions and business
 * validation.
 *
 * Covers full business setup, variant update success, uniqueness enforcement on
 * SKU/option_values_hash, permission enforcement, error on unauthorized
 * updates, and audit chain.
 *
 * 1. Register and authenticate as admin to get admin connection (with token)
 * 2. Create a channel (POST /shoppingMall/admin/channels)
 * 3. Create a section under that channel (POST
 *    /shoppingMall/admin/channels/{channelId}/sections)
 * 4. Create a category under that channel (POST
 *    /shoppingMall/admin/channels/{channelId}/categories)
 * 5. Register a product assigned to above channel/section/category (POST
 *    /shoppingMall/admin/products)
 * 6. Register a product variant (POST
 *    /shoppingMall/admin/products/{productId}/variants)
 * 7. Change sku_code, bar_code, price, stock_quantity, weight, option_values_hash
 *    (with new unique values) via PUT (admin only)
 * 8. Confirm the update response reflects changes and business rules (no duplicate
 *    SKUs, valid option_values_hash)
 * 9. Try updating as unauthenticated user and confirm forbidden/error
 * 10. Try duplicate SKU/option_values_hash update and confirm failure
 */
export async function test_api_product_variant_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInfo,
  });
  typia.assert(admin);

  // 2. Create a channel
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

  // 3. Create a section under the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // 4. Create a category under the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(category);

  // 5. Register a product
  const productInput = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "Active",
    business_status: "Approval",
  };
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 6. Register a product variant
  const variantInput = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
    bar_code: RandomGenerator.alphaNumeric(8),
    option_values_hash: RandomGenerator.alphaNumeric(32),
    price: 85000,
    stock_quantity: typia.random<number & tags.Type<"int32">>(),
    weight: 2.5,
  };
  const variant =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variantInput,
      },
    );
  typia.assert(variant);

  // 7. Update the variant
  const newSku = RandomGenerator.alphaNumeric(10);
  const newBar = RandomGenerator.alphaNumeric(8);
  const newOptionHash = RandomGenerator.alphaNumeric(32);
  const updateBody = {
    sku_code: newSku,
    bar_code: newBar,
    price: 99000,
    stock_quantity: typia.random<number & tags.Type<"int32">>() + 1,
    weight: 3.1,
    option_values_hash: newOptionHash,
  };
  const updated =
    await api.functional.shoppingMall.admin.products.variants.update(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "variant is updated",
    updated,
    variant,
    (key) => key === "updated_at",
  );
  TestValidator.equals("sku_code updated", updated.sku_code, newSku);
  TestValidator.equals("bar_code updated", updated.bar_code, newBar);
  TestValidator.equals("price updated", updated.price, 99000);
  TestValidator.equals("weight updated", updated.weight, 3.1);
  TestValidator.equals(
    "option_values_hash updated",
    updated.option_values_hash,
    newOptionHash,
  );
  TestValidator.predicate(
    "stock_quantity updated",
    updated.stock_quantity === updateBody.stock_quantity,
  );

  // 8. Permission: Forbidden for anonymous (use empty connection headers)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update variant",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.update(
        unauthConn,
        {
          productId: product.id,
          variantId: variant.id,
          body: updateBody,
        },
      );
    },
  );

  // 9. Business error: duplicate SKU/option_values_hash
  // First create a duplicate variant for collision
  const dupeVariant =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(12),
          bar_code: RandomGenerator.alphaNumeric(10),
          option_values_hash: RandomGenerator.alphaNumeric(32),
          price: 82000,
          stock_quantity: typia.random<number & tags.Type<"int32">>(),
          weight: 1.1,
        },
      },
    );
  typia.assert(dupeVariant);
  // Attempt update to duplicate the dupeVariant's SKU/option_values_hash
  await TestValidator.error("duplicate sku_code update blocked", async () => {
    await api.functional.shoppingMall.admin.products.variants.update(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: { sku_code: dupeVariant.sku_code },
      },
    );
  });
  await TestValidator.error(
    "duplicate option_values_hash update blocked",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.update(
        connection,
        {
          productId: product.id,
          variantId: variant.id,
          body: { option_values_hash: dupeVariant.option_values_hash },
        },
      );
    },
  );
}
