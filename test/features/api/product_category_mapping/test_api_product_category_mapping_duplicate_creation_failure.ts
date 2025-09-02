import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

export async function test_api_product_category_mapping_duplicate_creation_failure(
  connection: api.IConnection,
) {
  /**
   * Validate failure when trying to create a duplicate mapping of a product to
   * the same category.
   *
   * 1. Register an admin to obtain authenticated access.
   * 2. Create a product as the test subject for mapping operations.
   * 3. Create a category which will be used in the mapping.
   * 4. Successfully create a mapping between the product and the category.
   * 5. Attempt to re-create the same mapping; expect this to fail due to unique
   *    constraint.
   * 6. Assert that the second creation attempt is blocked, confirming proper
   *    enforcement of unique mapping.
   */
  // 1. Register and authenticate an admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = adminUsername + "@mall.test";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a product
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          slug: RandomGenerator.alphaNumeric(16),
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
          max_order_quantity: 5,
          tax_code: RandomGenerator.alphaNumeric(8),
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create a product category
  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          category_code: RandomGenerator.alphaNumeric(12),
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create the mapping between product and category
  const now = new Date().toISOString();
  const mappingRequest = {
    shopping_mall_ai_backend_products_id: product.id,
    shopping_mall_ai_backend_product_categories_id: category.id,
    assigned_at: now,
  } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate;
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: mappingRequest,
      },
    );
  typia.assert(mapping);
  TestValidator.equals(
    "created mapping product id matches",
    mapping.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "created mapping category id matches",
    mapping.shopping_mall_ai_backend_product_categories_id,
    category.id,
  );

  // 5. Attempt duplicate mapping creation; expect business error
  await TestValidator.error(
    "duplicate product-category mapping creation should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
        connection,
        {
          body: mappingRequest,
        },
      );
    },
  );
}
