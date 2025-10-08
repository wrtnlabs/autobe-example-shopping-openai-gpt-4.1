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
 * Validate that a seller cannot update a product's name to duplicate another
 * product's name within the same seller's catalog (enforces unique product name
 * per seller).
 *
 * Steps:
 *
 * 1. Register and authenticate an admin to create a category.
 * 2. Admin creates a valid product category.
 * 3. Register and authenticate a new seller.
 * 4. Simulate (via update or direct object assignment) creation of two products
 *    with distinct names for this seller (no create API is available, only
 *    update exists).
 * 5. Attempt to update the second product's name to match the first product's
 *    name.
 * 6. Assert that the API returns an error, confirming enforcement of the name
 *    uniqueness constraint per seller.
 */
export async function test_api_product_update_by_seller_duplicate_product_name(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPW123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category (admin)
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: categoryName + "(KO)",
        name_en: categoryName + "(EN)",
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessName = RandomGenerator.paragraph({ sentences: 3 });
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPW123!",
        business_name: sellerBusinessName,
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // Step 4: Simulate creation of two distinct products for this seller.
  // Assume product IDs are provided/generated for update.
  const productNameA = RandomGenerator.paragraph({ sentences: 2 });
  const productNameB = RandomGenerator.paragraph({ sentences: 2 });
  const productIdA = typia.random<string & tags.Format<"uuid">>();
  const productIdB = typia.random<string & tags.Format<"uuid">>();

  // Create two products with `update` (assuming empty products exist for this demo)
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: productIdA,
      body: {
        shopping_mall_category_id: category.id,
        name: productNameA,
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: productIdB,
      body: {
        shopping_mall_category_id: category.id,
        name: productNameB,
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(productB);

  // Step 5: Attempt to update productB name to productA's name (should fail)
  await TestValidator.error(
    "updating productB to duplicate name of productA should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productId: productIdB,
        body: {
          name: productA.name,
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
}
