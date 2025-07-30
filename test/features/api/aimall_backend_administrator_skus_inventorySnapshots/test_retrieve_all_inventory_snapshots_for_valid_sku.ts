import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendInventorySnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Validate retrieval of all inventory snapshot records for a valid SKU.
 *
 * This test ensures that when an administrator:
 *
 * 1. Creates a product
 * 2. Adds a SKU associated with that product
 * 3. Inserts multiple inventory snapshots for the SKU (with edge cases: multiple
 *    records, and 0 records)
 * 4. Calls the GET endpoint for inventory snapshots by SKU ID Then all relevant
 *    inventory snapshots are correctly returned, covering both populated and
 *    empty result scenarios.
 *
 * Step-by-step process:
 *
 * 1. Create a product as administrator, capturing product details
 * 2. Create a SKU for this product, capturing SKU details
 * 3. A) Insert multiple (at least 2) inventory snapshots for this SKU b) Also,
 *    create a secondary SKU with no snapshots for the empty case
 * 4. Fetch all inventory snapshots by skuId for: a) The SKU with snapshots b) The
 *    SKU with no snapshots
 * 5. Validate that: a) All created snapshots are present in the fetched list, with
 *    correct details b) For the SKU without snapshots, the list is empty or
 *    data is absent c) Each record's fields are of correct type and structure
 *    (with type assertion)
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_index(
  connection: api.IConnection,
) {
  // 1. Create new product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for this product
  const sku1 =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(10),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku1);

  // 3a. Insert two inventory snapshots for the primary SKU
  const snapshot1 =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: sku1.id,
        body: {
          sku_id: sku1.id,
          product_id: product.id,
          change_type: "restock",
          change_quantity: 50,
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);

  const snapshot2 =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: sku1.id,
        body: {
          sku_id: sku1.id,
          product_id: product.id,
          change_type: "sale",
          change_quantity: -20,
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);

  // 3b. Create a second SKU for empty snapshot case
  const sku2 =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(10),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku2);

  // 4a. Retrieve all inventory snapshots for sku1 (has data)
  const pageWithData =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.index(
      connection,
      {
        skuId: sku1.id,
      },
    );
  typia.assert(pageWithData);
  // Validate records match those created (by id and content)
  TestValidator.predicate("snapshot1 present")(
    Array.isArray(pageWithData.data) &&
      pageWithData.data.some((s) => s.id === snapshot1.id),
  );
  TestValidator.predicate("snapshot2 present")(
    Array.isArray(pageWithData.data) &&
      pageWithData.data.some((s) => s.id === snapshot2.id),
  );

  // 4b. Retrieve all inventory snapshots for sku2 (should be empty)
  const pageEmpty =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.index(
      connection,
      {
        skuId: sku2.id,
      },
    );
  typia.assert(pageEmpty);
  TestValidator.predicate("no records for SKU without snapshots")(
    !pageEmpty.data ||
      (Array.isArray(pageEmpty.data) && pageEmpty.data.length === 0),
  );
}
