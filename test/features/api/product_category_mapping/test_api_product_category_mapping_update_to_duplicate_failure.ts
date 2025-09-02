import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

export async function test_api_product_category_mapping_update_to_duplicate_failure(
  connection: api.IConnection,
) {
  /**
   * Test updating a product-category mapping to point to a product-category
   * pair that is already mapped elsewhere, which should result in a uniqueness
   * violation.
   *
   * 1. Admin joins and is authenticated
   * 2. Admin creates two products for mapping
   * 3. Admin creates two product categories
   * 4. Admin creates two mappings: (productA, categoryA), (productB, categoryB)
   * 5. Admin attempts to update mapping1 to (productB, categoryB) (same as
   *    mapping2)
   * 6. System should reject the update due to uniqueness constraint -- error
   *    expected
   */

  // 1. Admin joins/authenticates
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphabets(6)}@admin.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulate hash for test
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create two distinct products
  const productA =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({ paragraphs: 1 }),
          product_type: RandomGenerator.pick(["physical", "digital"] as const),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 1,
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
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({ paragraphs: 1 }),
          product_type: RandomGenerator.pick(["physical", "digital"] as const),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 2,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(productB);

  // 3. Create two categories
  const categoryA =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.name(1),
          category_code: RandomGenerator.alphaNumeric(8),
          sort_order: 1,
          is_active: true,
          category_depth: 0,
          parent_id: null,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(categoryA);
  const categoryB =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.name(1),
          category_code: RandomGenerator.alphaNumeric(8),
          sort_order: 2,
          is_active: true,
          category_depth: 0,
          parent_id: null,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(categoryB);

  // 4. Create two mappings: (A,A) and (B,B)
  const assignmentTime = new Date().toISOString();
  const mapping1 =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: productA.id,
          shopping_mall_ai_backend_product_categories_id: categoryA.id,
          assigned_at: assignmentTime,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping1);
  const mapping2 =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: productB.id,
          shopping_mall_ai_backend_product_categories_id: categoryB.id,
          assigned_at: assignmentTime,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping2);

  // 5. Attempt to update first mapping to (productB, categoryB) -- should fail (duplicate)
  await TestValidator.error(
    "updating product-category mapping to duplicate pair should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.update(
        connection,
        {
          mappingId: mapping1.id,
          body: {
            shopping_mall_ai_backend_products_id: productB.id,
            shopping_mall_ai_backend_product_categories_id: categoryB.id,
          } satisfies IShoppingMallAiBackendProductCategoryMapping.IUpdate,
        },
      );
    },
  );
}
