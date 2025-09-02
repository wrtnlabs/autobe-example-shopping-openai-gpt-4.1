import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

export async function test_api_product_category_mapping_detail_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful detail retrieval of a product-category mapping by
   * mappingId in the shopping mall AI backend (admin role).
   *
   * This test walks through all prerequisite business flows to assert the
   * mapping detail endpoint:
   *
   * 1. Admin registration & authentication
   * 2. Product creation (backoffice)
   * 3. Product category creation (backoffice)
   * 4. Mapping product to category
   * 5. Fetch mapping details by mappingId and check all references
   *
   * Edge/error handling (not-found/unauthorized) is intentionally excluded
   * (positive path only).
   */

  // Step 1: Admin registration and authentication
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(2).replace(/\s+/g, "").toLowerCase(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // Step 2: Product creation
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
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
    tax_code: `TAX_${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    sort_priority: 1,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // Step 3: Product category creation
  const categoryInput: IShoppingMallAiBackendProductCategory.ICreate = {
    category_name: RandomGenerator.name(),
    category_code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    is_active: true,
    category_depth: 0,
    sort_order: 1,
    parent_id: null,
  };
  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      { body: categoryInput },
    );
  typia.assert(category);

  // Step 4: Establish product-category mapping
  const now = new Date();
  const mappingInput: IShoppingMallAiBackendProductCategoryMapping.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    shopping_mall_ai_backend_product_categories_id: category.id,
    assigned_at: now.toISOString(),
  };
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      { body: mappingInput },
    );
  typia.assert(mapping);

  // Step 5: Retrieve mapping detail by mappingId
  const mappingDetail =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.at(
      connection,
      { mappingId: mapping.id },
    );
  typia.assert(mappingDetail);

  // Field-level business assertions
  TestValidator.equals("mapping id matches", mappingDetail.id, mapping.id);
  TestValidator.equals(
    "linked product id matches",
    mappingDetail.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "linked category id matches",
    mappingDetail.shopping_mall_ai_backend_product_categories_id,
    category.id,
  );
  TestValidator.equals(
    "assigned_at matches",
    mappingDetail.assigned_at,
    mappingInput.assigned_at,
  );
}
