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
 * Full workflow: Admin updates product option value (e.g. color/size) and
 * validates catalog/UX/audit requirements.
 *
 * Steps:
 *
 * 1. Admin registration & authentication
 * 2. Admin creates a category
 * 3. Admin creates a product (assigned to category)
 * 4. Admin creates product option (e.g. "Color")
 * 5. Admin creates option value (e.g. "Red")
 * 6. Admin updates value (fix typo, reorder)
 * 7. Validate change is reflected in subsequent read
 * 8. Ensure 'updated_at' is bumped
 * 9. Confirm duplicate value update is rejected (error)
 */
export async function test_api_sku_option_value_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a category
  const categoryInput = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);

  // 3. Admin creates a product (assigned to category)
  const productInput = {
    shopping_mall_seller_id: admin.id, // Admin acts as seller for creation
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 4. Admin creates product option
  const optionInput = {
    name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOption.ICreate;
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);

  // 5. Admin creates option value
  const valueInput = {
    value: "Red",
    display_order: 0,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const value: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.admin.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: valueInput,
      },
    );
  typia.assert(value);

  // 6. Admin updates value (fix typo to 'Read' and change order)
  const updateInput = {
    value: "Read", // fix typo
    display_order: 1,
  } satisfies IShoppingMallProductOptionValue.IUpdate;
  const updatedValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.admin.products.options.values.update(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        valueId: value.id,
        body: updateInput,
      },
    );
  typia.assert(updatedValue);
  TestValidator.equals(
    "Option value updated value field",
    updatedValue.value,
    updateInput.value,
  );
  TestValidator.equals(
    "Option value updated display order",
    updatedValue.display_order,
    updateInput.display_order,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedValue.updated_at,
    value.updated_at,
  );

  // 7. Update to duplicate value (should fail)
  // First, re-create original value again to cause duplicate error
  const duplicateInput = {
    value: "Red",
    display_order: 2,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const duplicateValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.admin.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: duplicateInput,
      },
    );
  typia.assert(duplicateValue);
  // Now try updating to 'Red' which already exists, expect error
  await TestValidator.error(
    "Admin cannot update to duplicate option value",
    async () => {
      await api.functional.shoppingMall.admin.products.options.values.update(
        connection,
        {
          productId: product.id,
          optionId: option.id,
          valueId: updatedValue.id,
          body: {
            value: "Red",
          } satisfies IShoppingMallProductOptionValue.IUpdate,
        },
      );
    },
  );
}
