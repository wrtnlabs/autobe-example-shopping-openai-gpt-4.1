import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";
import type { IPageIAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendInventorySnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filtering of inventory snapshots for a specific
 * SKU.
 *
 * This test ensures that the inventory snapshot search endpoint for a SKU
 * supports correct filtering, pagination, and edge cases. It simulates
 * real-world audit and analytics scenarios at the SKU level, where inventory
 * movements of different types ('restock', 'sale', 'manual_adjust') occur, and
 * an administrator or analytics engine needs to filter and analyze the
 * inventory change history.
 *
 * Test Steps:
 *
 * 1. Create a product (using a random category_id and seller_id).
 * 2. Create a SKU for the product (unique sku_code).
 * 3. Insert three inventory snapshot events for the SKU, each with a different
 *    change_type.
 * 4. Query all inventory snapshots for the SKU (no filters), verify all result
 *    data and pagination.
 * 5. Query by each change_type and assert only the matching snapshot is returned
 *    per type.
 * 6. Paginate results (limit 2, then retrieve both first and second page).
 * 7. Query for a change_type that does not exist to confirm an empty result.
 *
 * Assertions:
 *
 * - The snapshot search result matches the inserted data.
 * - Filtering by change_type works as expected.
 * - Pagination fields and slicing is correct.
 * - Empty results are handled properly (empty array with valid pagination).
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_advanced_search_filtering_of_inventory_snapshots(
  connection: api.IConnection,
) {
  // 1. Create a product
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Advanced Search SKU Product",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for this product
  const sku: IAimallBackendSku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: `SKU-${Math.random().toString(36).slice(2, 10)}`,
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Add three inventory snapshots for the SKU (restock, sale, manual_adjust)
  const changeTypes = ["restock", "sale", "manual_adjust"];
  const snapshots: IAimallBackendInventorySnapshot[] = [];
  for (let i = 0; i < changeTypes.length; ++i) {
    const snapshot =
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
        connection,
        {
          skuId: sku.id,
          body: {
            sku_id: sku.id,
            product_id: product.id,
            change_type: changeTypes[i],
            change_quantity: (i + 1) * 10 * (i % 2 === 0 ? 1 : -1),
            changed_by: product.seller_id,
          } satisfies IAimallBackendInventorySnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }

  // 4. Search for all inventory snapshots with no additional filter (should return all, paginated)
  const pageDefault =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
        } satisfies IAimallBackendInventorySnapshot.IRequest,
      },
    );
  typia.assert(pageDefault);
  TestValidator.equals("all records returned")(pageDefault.data?.length)(
    snapshots.length,
  );
  if (pageDefault.data) {
    for (const result of pageDefault.data) {
      TestValidator.predicate("Snapshot exists from created set")(
        snapshots.some((orig) => orig.id === result.id),
      );
    }
  }
  TestValidator.predicate("pagination metadata present")(
    !!pageDefault.pagination,
  );
  if (pageDefault.pagination) {
    TestValidator.equals("pagination.records matches")(
      pageDefault.pagination.records,
    )(snapshots.length);
  }

  // 5. Search by each change_type
  for (const changeType of changeTypes) {
    const filteredPage =
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
        connection,
        {
          skuId: sku.id,
          body: {
            sku_id: sku.id,
            change_type: changeType,
          } satisfies IAimallBackendInventorySnapshot.IRequest,
        },
      );
    typia.assert(filteredPage);
    TestValidator.equals(`records for type '${changeType}'`)(
      filteredPage.data?.length,
    )(1);
    if (filteredPage.data && filteredPage.data.length > 0) {
      TestValidator.equals(`filtered change_type matches`)(
        filteredPage.data[0].change_type,
      )(changeType);
    }
  }

  // 6. Pagination: limit 2, page 1 and 2
  const page1 =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
          page: 1,
          limit: 2,
        } satisfies IAimallBackendInventorySnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 item count")(page1.data?.length)(2);
  TestValidator.equals("page 1 current")(page1.pagination?.current)(1);

  const page2 =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
          page: 2,
          limit: 2,
        } satisfies IAimallBackendInventorySnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 item count")(page2.data?.length)(1);
  TestValidator.equals("page 2 current")(page2.pagination?.current)(2);

  // 7. Query for non-existent change_type (should be empty result)
  const emptyPage =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
          change_type: "non_existing_type",
        } satisfies IAimallBackendInventorySnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty search result")(emptyPage.data?.length)(0);
}
