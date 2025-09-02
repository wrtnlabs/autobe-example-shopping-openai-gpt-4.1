import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";
import type { IPageIShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductCategoryMapping";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_product_category_mapping_index_basic_search(
  connection: api.IConnection,
) {
  /**
   * Test retrieving product-category mappings with full search and pagination
   * flows:
   *
   * 1. Admin authenticates (join)
   * 2. Admin creates product
   * 3. Admin creates product category
   * 4. Admin maps product to category
   * 5. PATCH index endpoint is queried a) no filters, b) filter by product id, c)
   *    filter by category id, d) filter by both and e) queried with random,
   *    non-matching uuids (should yield empty result)
   *
   * For each query, asserted:
   *
   * - API returns correct mapping(s) according to filter
   * - Fields in summary match the result of mapping created
   * - API paginates and counts records correctly, asserting at each step
   * - Edge case: query not matching any mapping yields zero result
   */
  // 1. Admin joins and authenticates
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@business.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin join success: username matches",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin join success: email matches",
    adminJoin.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin is active after join",
    adminJoin.admin.is_active === true,
  );

  // 2. Admin creates a product
  const productTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const productSlug = RandomGenerator.alphaNumeric(10);
  const productType = RandomGenerator.pick([
    "physical",
    "digital",
    "service",
  ] as const);
  const businessStatus = RandomGenerator.pick([
    "active",
    "draft",
    "paused",
  ] as const);
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: productTitle,
          slug: productSlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 8,
          }),
          product_type: productType,
          business_status: businessStatus,
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphabets(5),
          sort_priority: 10,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "created product title matches input",
    product.title,
    productTitle,
  );
  TestValidator.equals(
    "created product type matches input",
    product.product_type,
    productType,
  );
  TestValidator.equals(
    "created product slug matches input",
    product.slug,
    productSlug,
  );
  TestValidator.predicate(
    "created product is not deleted",
    !product.deleted_at,
  );

  // 3. Admin creates a product category
  const categoryName = RandomGenerator.name();
  const categoryCode = RandomGenerator.alphaNumeric(8);
  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: categoryName,
          category_code: categoryCode,
          sort_order: 1,
          is_active: true,
          category_depth: 0,
          parent_id: null,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created name matches input",
    category.category_name,
    categoryName,
  );
  TestValidator.equals("category created active", category.is_active, true);
  TestValidator.equals("category created depth", category.category_depth, 0);
  TestValidator.predicate("category is not deleted", !category.deleted_at);

  // 4. Admin creates a mapping between product and category
  const assignedAt = new Date().toISOString();
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          shopping_mall_ai_backend_product_categories_id: category.id,
          assigned_at: assignedAt,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping);
  TestValidator.equals(
    "mapping product id matches created product",
    mapping.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "mapping category id matches created category",
    mapping.shopping_mall_ai_backend_product_categories_id,
    category.id,
  );
  TestValidator.equals(
    "mapping assigned_at matches input",
    mapping.assigned_at,
    assignedAt,
  );

  // 5a. Query with no filters (should return our mapping)
  const indexNoFilters =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.IRequest,
      },
    );
  typia.assert(indexNoFilters);
  TestValidator.predicate(
    "pagination returns at least one mapping",
    indexNoFilters.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination contains our mapping",
    indexNoFilters.data.some((d) => d.id === mapping.id),
  );
  // Find and compare relevant summary fields
  const foundMappingNoFilters = indexNoFilters.data.find(
    (m) => m.id === mapping.id,
  );
  if (foundMappingNoFilters) {
    TestValidator.equals(
      "summary product id matches",
      foundMappingNoFilters.shopping_mall_ai_backend_products_id,
      mapping.shopping_mall_ai_backend_products_id,
    );
    TestValidator.equals(
      "summary category id matches",
      foundMappingNoFilters.shopping_mall_ai_backend_product_categories_id,
      mapping.shopping_mall_ai_backend_product_categories_id,
    );
    TestValidator.equals(
      "summary assigned_at matches",
      foundMappingNoFilters.assigned_at,
      mapping.assigned_at,
    );
  }
  TestValidator.predicate(
    "total records at least one",
    indexNoFilters.pagination.records >= 1,
  );

  // 5b. Query filter by product id
  const indexByProduct =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.index(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.IRequest,
      },
    );
  typia.assert(indexByProduct);
  TestValidator.predicate(
    "filter by product returns at least one result",
    indexByProduct.data.length >= 1,
  );
  TestValidator.predicate(
    "filter by product contains our mapping",
    indexByProduct.data.some((d) => d.id === mapping.id),
  );
  const foundMappingByProduct = indexByProduct.data.find(
    (m) => m.id === mapping.id,
  );
  if (foundMappingByProduct) {
    TestValidator.equals(
      "product filter summary product id matches",
      foundMappingByProduct.shopping_mall_ai_backend_products_id,
      product.id,
    );
    TestValidator.equals(
      "product filter summary category id matches",
      foundMappingByProduct.shopping_mall_ai_backend_product_categories_id,
      category.id,
    );
    TestValidator.equals(
      "product filter summary assigned_at matches",
      foundMappingByProduct.assigned_at,
      mapping.assigned_at,
    );
  }
  TestValidator.predicate(
    "product filter record count at least one",
    indexByProduct.pagination.records >= 1,
  );

  // 5c. Query filter by category id
  const indexByCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.index(
      connection,
      {
        body: {
          shopping_mall_ai_backend_product_categories_id: category.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.IRequest,
      },
    );
  typia.assert(indexByCategory);
  TestValidator.predicate(
    "filter by category returns at least one result",
    indexByCategory.data.length >= 1,
  );
  TestValidator.predicate(
    "filter by category contains our mapping",
    indexByCategory.data.some((d) => d.id === mapping.id),
  );
  const foundMappingByCategory = indexByCategory.data.find(
    (m) => m.id === mapping.id,
  );
  if (foundMappingByCategory) {
    TestValidator.equals(
      "category filter summary product id matches",
      foundMappingByCategory.shopping_mall_ai_backend_products_id,
      product.id,
    );
    TestValidator.equals(
      "category filter summary category id matches",
      foundMappingByCategory.shopping_mall_ai_backend_product_categories_id,
      category.id,
    );
    TestValidator.equals(
      "category filter summary assigned_at matches",
      foundMappingByCategory.assigned_at,
      mapping.assigned_at,
    );
  }
  TestValidator.predicate(
    "category filter record count at least one",
    indexByCategory.pagination.records >= 1,
  );

  // 5d. Query filter by BOTH product and category (should only get our mapping)
  const indexByBoth =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.index(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          shopping_mall_ai_backend_product_categories_id: category.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.IRequest,
      },
    );
  typia.assert(indexByBoth);
  TestValidator.predicate(
    "filter by both returns at least one result",
    indexByBoth.data.length >= 1,
  );
  TestValidator.equals(
    "first mapping by both matches our mapping",
    indexByBoth.data[0].id,
    mapping.id,
  );
  const foundMappingByBoth = indexByBoth.data.find((m) => m.id === mapping.id);
  if (foundMappingByBoth) {
    TestValidator.equals(
      "both filter summary product id matches",
      foundMappingByBoth.shopping_mall_ai_backend_products_id,
      product.id,
    );
    TestValidator.equals(
      "both filter summary category id matches",
      foundMappingByBoth.shopping_mall_ai_backend_product_categories_id,
      category.id,
    );
    TestValidator.equals(
      "both filter summary assigned_at matches",
      foundMappingByBoth.assigned_at,
      mapping.assigned_at,
    );
  }
  TestValidator.predicate(
    "both filter record count at least one",
    indexByBoth.pagination.records >= 1,
  );

  // 5e. Query with random non-matching IDs (should return empty set)
  const indexNonMatch =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.index(
      connection,
      {
        body: {
          shopping_mall_ai_backend_products_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_ai_backend_product_categories_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductCategoryMapping.IRequest,
      },
    );
  typia.assert(indexNonMatch);
  TestValidator.equals(
    "non-matching filters returns zero results",
    indexNonMatch.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching filter records is zero",
    indexNonMatch.pagination.records,
    0,
  );
}
