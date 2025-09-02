import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

export async function test_api_product_category_mapping_update_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful update of a product-category mapping by an admin.
   *
   * This scenario covers the business flow where a shopping mall admin manages
   * product-category association, specifically verifying that updating the
   * mapping record works as intended. The test sets up the prerequisites
   * (admin, products, category, initial mapping), then updates the mapping to
   * point to a new product and validates the change.
   *
   * Steps:
   *
   * 1. Register an admin (auto-login for subsequent requests).
   * 2. Create two distinct products (A, B).
   * 3. Create a product category.
   * 4. Create a mapping between product A and the category.
   * 5. Update the mapping to reference product B.
   * 6. Validate the mapping now references product B (not A) and same category.
   */

  // 1. Register an admin for authorization context (auto-login on join)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create two distinct products
  const productA =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: RandomGenerator.pick([
            "draft",
            "active",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(productA);

  const productB =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: RandomGenerator.pick([
            "draft",
            "active",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(productB);

  // 3. Create a product category
  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.name(2),
          category_code: RandomGenerator.alphaNumeric(8),
          is_active: true,
          sort_order: 0,
          category_depth: 0,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create a mapping between product A and the category
  const now = new Date().toISOString();
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: productA.id,
          shopping_mall_ai_backend_product_categories_id: category.id,
          assigned_at: now,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping);

  // 5. Update the mapping to reference product B (change product, keep category)
  const updated =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.update(
      connection,
      {
        mappingId: mapping.id,
        body: {
          shopping_mall_ai_backend_products_id: productB.id,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.IUpdate,
      },
    );
  typia.assert(updated);

  // 6. Validate that mapping now references product B (not A), category unchanged
  TestValidator.equals(
    "mapping references updated product (B)",
    updated.shopping_mall_ai_backend_products_id,
    productB.id,
  );
  TestValidator.equals(
    "category remains unchanged",
    updated.shopping_mall_ai_backend_product_categories_id,
    category.id,
  );
  // Optionally: mapping id remains the same
  TestValidator.equals(
    "mapping id remains consistent after update",
    updated.id,
    mapping.id,
  );
}
