import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";

/**
 * Validates that an admin can successfully delete a product option from a
 * product when no SKUs use that option.
 *
 * Business workflow:
 *
 * 1. Admin account is registered and authenticated
 * 2. Admin creates a product category
 * 3. Admin creates a product under that category
 * 4. Admin creates a product option (e.g. 'Color') not assigned to any SKU
 * 5. Admin deletes the product option
 * 6. Validates that deletion is successful (void response)
 * 7. (Cannot retrieve deleted option, as no retrieve API exists)
 * 8. (Audit log validation is not possible -- omitted)
 *
 * This tests the normal deletion path with all necessary dependencies
 * satisfied.
 */
export async function test_api_product_option_delete_by_admin_with_no_sku_dependency(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestStrongPwd123!",
        full_name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create a new product under the created category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create a product option (not linked to any SKU)
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: "Test Option " + RandomGenerator.alphabets(5),
          display_order: 0,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 5. Delete the product option
  const result = await api.functional.shoppingMall.admin.products.options.erase(
    connection,
    {
      productId: product.id,
      optionId: option.id,
    },
  );
  TestValidator.equals(
    "option deletion should return void (undefined)",
    result,
    undefined,
  );

  // 6. (No retrieval or audit log API exists to confirm, logic stops here)
}
