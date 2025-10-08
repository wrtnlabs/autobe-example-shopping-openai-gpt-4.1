import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * End-to-end test for seller updating product option value (e.g., color or
 * size). Covers full business flow and all errors/edges:
 *
 * 1. Create product category (admin)
 * 2. Create seller role (admin)
 * 3. Create/register seller and authenticate
 * 4. Seller creates product in given category
 * 5. Seller creates a product option (e.g., 'Color')
 * 6. Seller adds an option value (e.g., 'Red')
 * 7. Seller updates the value to a new display value (e.g., 'Burgundy')
 * 8. Seller updates the value's display order
 * 9. Checks that update persists and updates timestamps
 * 10. Negative: attempt update to duplicate display value (should error)
 * 11. Negative: attempt update by a different seller (should error)
 */
export async function test_api_sku_option_value_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Create product category (admin)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 2. Create seller role (admin)
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Seller role for test scenario",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // 3. Register seller and authenticate
  const email = `${RandomGenerator.alphaNumeric(10)}@mail.com`;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(11),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 4. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerAuth.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Seller creates a product option
  const option =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: "Color",
          display_order: 0,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 6. Seller adds option value (e.g., "Red")
  const initialValue =
    await api.functional.shoppingMall.seller.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: {
          value: "Red",
          display_order: 0,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(initialValue);

  // 7. Seller updates the value's display text (to, e.g., "Burgundy")
  const updatedValueText = "Burgundy";
  const updatedValue =
    await api.functional.shoppingMall.seller.products.options.values.update(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        valueId: initialValue.id,
        body: {
          value: updatedValueText,
        } satisfies IShoppingMallProductOptionValue.IUpdate,
      },
    );
  typia.assert(updatedValue);
  TestValidator.equals(
    "option value updated",
    updatedValue.value,
    updatedValueText,
  );
  TestValidator.notEquals(
    "updated_at is refreshed",
    updatedValue.updated_at,
    initialValue.updated_at,
  );

  // 8. Seller updates order
  const newOrder = 1;
  const updatedOrder =
    await api.functional.shoppingMall.seller.products.options.values.update(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        valueId: initialValue.id,
        body: {
          display_order: newOrder,
        } satisfies IShoppingMallProductOptionValue.IUpdate,
      },
    );
  typia.assert(updatedOrder);
  TestValidator.equals(
    "display_order updated",
    updatedOrder.display_order,
    newOrder,
  );

  // 9. Try to update to a duplicate value under same option (should error)
  const dupeValue =
    await api.functional.shoppingMall.seller.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: {
          value: "Blue",
          display_order: 2,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(dupeValue);
  await TestValidator.error("duplicate value rejected", async () => {
    await api.functional.shoppingMall.seller.products.options.values.update(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        valueId: dupeValue.id,
        body: {
          value: "Burgundy",
        } satisfies IShoppingMallProductOptionValue.IUpdate,
      },
    );
  });

  // 10. Create a secondary seller, ensure cannot update other seller's value
  const secondEmail = `${RandomGenerator.alphaNumeric(10)}@mail.com`;
  const secondSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: secondEmail,
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(11),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSeller);
  await TestValidator.error(
    "other seller cannot update option value",
    async () => {
      await api.functional.shoppingMall.seller.products.options.values.update(
        connection,
        {
          productId: product.id,
          optionId: option.id,
          valueId: dupeValue.id,
          body: {
            value: "Mint",
          } satisfies IShoppingMallProductOptionValue.IUpdate,
        },
      );
    },
  );
}
