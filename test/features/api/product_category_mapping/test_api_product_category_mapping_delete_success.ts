import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

/**
 * Test successful deletion of a product-category mapping by an admin user.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin account. This grants admin
 *    privileges for all subsequent operations.
 * 2. Create a new product using valid random data.
 * 3. Create a new product category using valid random data.
 * 4. Create a product-category mapping linking the new product and category.
 * 5. Delete this mapping using its unique mappingId.
 * 6. Attempt to delete the mapping again using the same mappingId and expect
 *    an error, confirming deletion was successful. Validation:
 *
 * - The mapping is deleted without errors on the first attempt.
 * - The second deletion operation fails (not found), confirming the mapping
 *   was removed successfully.
 *
 * Note: As there is no 'get by ID' or list endpoint for mappings in the
 * provided API functions, error on repeat deletion is used for
 * verification.
 */
export async function test_api_product_category_mapping_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Admin account registration and login
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Normally would be a hash
  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinRes);

  // Step 2: Create a product
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({ paragraphs: 2 }),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // Step 3: Create a product category
  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.name(2),
          category_code: RandomGenerator.alphaNumeric(10),
          is_active: true,
          sort_order: 0,
          category_depth: 0,
          parent_id: null,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create the mapping entity
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          shopping_mall_ai_backend_product_categories_id: category.id,
          assigned_at: new Date().toISOString(),
        } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping);

  // Step 5: Delete the created mapping
  await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.erase(
    connection,
    { mappingId: mapping.id },
  );

  // Step 6: Assert deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting mapping again should fail (already deleted)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.erase(
        connection,
        { mappingId: mapping.id },
      );
    },
  );
}
