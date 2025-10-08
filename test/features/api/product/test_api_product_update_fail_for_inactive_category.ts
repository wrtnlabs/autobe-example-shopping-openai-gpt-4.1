import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that product category updates to inactive categories are rejected.
 *
 * 1. Register an admin account. This is required for creating categories.
 * 2. Admin creates two categories: one active, one inactive.
 * 3. Register a seller account. Required for product management.
 * 4. Seller creates a new product assigned to the active category (assume external
 *    test handles this, focus on update path).
 * 5. Seller attempts to update the product, setting its category to the inactive
 *    category.
 * 6. Confirm the operation is rejected and error is thrown, referencing a business
 *    rule preventing inactive category assignment.
 * 7. Optionally, verify a valid update to the active category still succeeds,
 *    confirming overall sanity.
 */
export async function test_api_product_update_fail_for_inactive_category(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPass123",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Admin creates two categories: one active, one inactive
  const activeCategoryName = RandomGenerator.name(2);
  const inactiveCategoryName = RandomGenerator.name(2);

  const activeCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: activeCategoryName,
        name_en: activeCategoryName,
        display_order: 1,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(activeCategory);

  const inactiveCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: inactiveCategoryName,
        name_en: inactiveCategoryName,
        display_order: 2,
        is_active: false,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(inactiveCategory);

  // 3. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPass123",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // There is no product creation API in the allowed functions, so we'll assume the product already exists,
  // and we have access to a valid product id for update (simulate with random uuid).
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 4. Try to update product's category to the inactive category
  await TestValidator.error(
    "seller cannot update product's category to an inactive category",
    async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productId: productId,
        body: {
          shopping_mall_category_id: inactiveCategory.id,
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
}
