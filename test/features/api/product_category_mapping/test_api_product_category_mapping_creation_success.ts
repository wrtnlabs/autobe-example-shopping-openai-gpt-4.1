import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

export async function test_api_product_category_mapping_creation_success(
  connection: api.IConnection,
) {
  /**
   * Test successful creation of a product-category mapping by an authenticated
   * admin.
   *
   * Business flow:
   *
   * 1. Register a new admin account and login. Auth must succeed and bearer stored
   *    in connection.
   * 2. As admin, create a Product using required Product.ICreate fields.
   * 3. Create a Product Category with productCategories.create endpoint, using
   *    typical ICreate properties.
   * 4. Submit a create request to productCategoryMappings.create, passing the
   *    product id, category id, and an assigned_at value with the current
   *    time.
   * 5. Assert mapping creation success. Confirm response shape and IDs.
   *    Optionally, assert mapped product and category IDs match the originals.
   *
   * Note: This test does not persistently re-fetch the mapping object after
   * creation, as index/at endpoint is not present for mapping entity in this
   * context. Success is validated via returned mapping object.
   */

  // 1. Register new admin and authenticate
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulated hash string
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin join provides token",
    typeof adminAuth.token.access === "string" && !!adminAuth.token.access,
  );
  typia.assert(adminAuth.admin);

  // 2. Create a Product
  const slug = RandomGenerator.alphaNumeric(12);
  const productTitle = RandomGenerator.name(3);
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: productTitle,
          slug,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(8),
          sort_priority: 10,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create a Product Category
  const categoryName = RandomGenerator.name(2);
  const categoryCode = RandomGenerator.alphaNumeric(12);
  const productCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: categoryName,
          category_code: categoryCode,
          sort_order: 100,
          is_active: true,
          category_depth: 1,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 4. Create a Product-Category Mapping
  const nowISO = new Date().toISOString();
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          shopping_mall_ai_backend_product_categories_id: productCategory.id,
          assigned_at: nowISO,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping);
  TestValidator.predicate(
    "mapping uses assigned product id",
    mapping.shopping_mall_ai_backend_products_id === product.id,
  );
  TestValidator.predicate(
    "mapping uses assigned category id",
    mapping.shopping_mall_ai_backend_product_categories_id ===
      productCategory.id,
  );
  TestValidator.equals(
    "assigned_at is correct (may differ by ms)",
    mapping.assigned_at.substring(0, 19),
    nowISO.substring(0, 19),
  );
}
