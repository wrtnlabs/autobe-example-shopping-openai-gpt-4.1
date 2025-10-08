import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";

/**
 * Validate the full workflow for an admin to add a value to a product option.
 *
 * This test ensures that an administrator account can register, create a
 * category, create a product under that category, create a product option (such
 * as 'Color'), and finally add a new value (such as 'Blue') to that option. The
 * test confirms proper admin authentication, category- and product-level
 * associations, and creation of the option value with expected properties. Only
 * the success path is tested—edge cases and error paths are not included.
 *
 * Workflow:
 *
 * 1. Register a new admin.
 * 2. Create a category under the mall.
 * 3. Create a product for the admin in that category.
 * 4. Create a product option for that product.
 * 5. Add a new value to the created product option.
 * 6. Assert the successful creation and ensure association with proper IDs and
 *    content.
 */
export async function test_api_product_option_value_creation_by_admin_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: joinEmail,
      password: "1234StrongPw!",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(1),
        name_en: RandomGenerator.name(1),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create a product using that category
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: adminJoin.id, // Admin acts as seller here
        name: productName,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Create a product option (e.g. 'Color')
  const optionName = "Color";
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName,
          display_order: 0,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 5. Add a value to the product option (e.g. 'Blue')
  const valueName = "Blue";
  const value =
    await api.functional.shoppingMall.admin.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: {
          value: valueName,
          display_order: 0,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(value);

  // 6. Business logic assertions
  TestValidator.equals(
    "option value is associated with proper option",
    value.shopping_mall_product_option_id,
    option.id,
  );
  TestValidator.equals(
    "option value label matches input",
    value.value,
    valueName,
  );
  TestValidator.equals(
    "option value display order is correct",
    value.display_order,
    0,
  );
}
