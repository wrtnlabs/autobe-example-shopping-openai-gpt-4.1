import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import type { IPageIShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test admin paginated and filtered bundle (SKU/variant) listing for a
 * product via PATCH
 * /shoppingMallAiBackend/admin/products/{productId}/bundles.
 *
 * 1. Register an admin (using /auth/admin/join) to get authentication context.
 * 2. Create a product (with all required fields) as admin.
 * 3. Create at least two bundles (variants) for the product to ensure
 *    non-empty and paginatable list.
 * 4. Retrieve paginated bundles list via PATCH with productId and { page,
 *    limit, sort_order }.
 * 5. Assert the returned page contains the created bundles.
 * 6. Filter by a bundle_name (search field) and verify result filtering works.
 * 7. If more bundles than a page limit exist, verify pagination data (pages,
 *    records, etc.).
 */
export async function test_api_product_bundle_admin_list_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a new product
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          slug: RandomGenerator.alphaNumeric(12),
          product_type: RandomGenerator.pick(["physical", "digital"] as const),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(8),
          sort_priority: 1,
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create several bundles for this product
  const bundles = await ArrayUtil.asyncMap([0, 1, 2], async (index) => {
    const bundle =
      await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_ai_backend_products_id: product.id,
            bundle_name: `Test Bundle ${index} ${RandomGenerator.name(1)}`,
            sku_code: RandomGenerator.alphaNumeric(10) + index,
            price: 1000 + index * 100,
            inventory_policy: RandomGenerator.pick([
              "track",
              "ignore",
              "inherit",
            ] as const),
            is_active: true,
          } satisfies IShoppingMallAiBackendProductBundle.ICreate,
        },
      );
    typia.assert(bundle);
    return bundle;
  });

  // 4. List bundles with pagination (page: 1, limit: 2)
  const pagedResult =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          page: 1,
          limit: 2,
          sort_order: "asc",
        } satisfies IShoppingMallAiBackendProductBundle.IRequest,
      },
    );
  typia.assert(pagedResult);

  // 5. Assert page contains created bundles and pagination is correct
  TestValidator.predicate(
    "bundle list includes created bundles",
    pagedResult.data.some((x) => bundles.some((b) => b.id === x.id)),
  );
  TestValidator.equals(
    "pagination limit matches",
    pagedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records >= total created",
    pagedResult.pagination.records >= bundles.length,
  );
  TestValidator.predicate(
    "pagination pages >= 2 if more than 2 bundles",
    bundles.length > 2 ? pagedResult.pagination.pages >= 2 : true,
  );

  // 6. Filter bundles using bundle_name search
  const targetBundle = bundles[1];
  const searchResult =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          search: targetBundle.bundle_name.slice(0, 4),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns bundle with searched name",
    searchResult.data.some((x) => x.id === targetBundle.id),
  );
  TestValidator.predicate(
    "all found bundles include search substring",
    searchResult.data.every((x) =>
      x.bundle_name.includes(targetBundle.bundle_name.slice(0, 4)),
    ),
  );
}
