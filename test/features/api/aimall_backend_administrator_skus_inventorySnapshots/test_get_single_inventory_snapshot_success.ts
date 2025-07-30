import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test successful retrieval of a specific inventory snapshot.
 *
 * This test verifies that, given a valid SKU and inventory snapshot ID, the
 * correct inventory snapshot details can be retrieved via the API. The business
 * workflow begins by creating a product, then a SKU for that product, followed
 * by creating multiple inventory snapshots for the SKU. The test retrieves one
 * inventory snapshot by its ID and confirms that the returned information is
 * accurate and matches what was inserted.
 *
 * Steps:
 *
 * 1. Create a new product to serve as the basis for the SKU and inventory events.
 * 2. Create a SKU associated with the product.
 * 3. Create two inventory snapshots for the new SKU. Keep their responses to use
 *    their IDs.
 * 4. Retrieve the first inventory snapshot by its ID, using the SKU ID and
 *    snapshot ID.
 * 5. Validate that the inventory snapshot returned matches exactly the data of the
 *    original creation (type, quantity, changed_by, timestamp, etc).
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_get_single_inventory_snapshot_success(
  connection: api.IConnection,
) {
  // 1. Create a product (categories/sellers must be real or random).
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          // main_thumbnail_uri omitted (field is string | undefined)
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for this product.
  const sku_code = RandomGenerator.alphaNumeric(12);
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code,
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Create two inventory snapshots for the SKU.
  const inventorySnapshots = await ArrayUtil.asyncRepeat(2)(async () => {
    const snapshot =
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
        connection,
        {
          skuId: sku.id,
          body: {
            sku_id: sku.id,
            product_id: product.id,
            change_type: RandomGenerator.pick([
              "manual_adjust",
              "restock",
              "sale",
            ]),
            change_quantity:
              typia.random<number & tags.Type<"int32">>() *
              RandomGenerator.pick([1, -1]),
            changed_by: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAimallBackendInventorySnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
    return snapshot;
  });

  // 4. Retrieve the first inventory snapshot by its ID.
  const retrieved =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.at(
      connection,
      {
        skuId: inventorySnapshots[0].sku_id,
        inventorySnapshotId: inventorySnapshots[0].id,
      },
    );
  typia.assert(retrieved);

  // 5. Validate the snapshot details match exactly.
  TestValidator.equals("sku_id matches")(retrieved.sku_id)(
    inventorySnapshots[0].sku_id,
  );
  TestValidator.equals("product_id matches")(retrieved.product_id)(
    inventorySnapshots[0].product_id,
  );
  TestValidator.equals("change_type matches")(retrieved.change_type)(
    inventorySnapshots[0].change_type,
  );
  TestValidator.equals("change_quantity matches")(retrieved.change_quantity)(
    inventorySnapshots[0].change_quantity,
  );
  TestValidator.equals("changed_by matches")(retrieved.changed_by)(
    inventorySnapshots[0].changed_by,
  );
  TestValidator.equals("id matches")(retrieved.id)(inventorySnapshots[0].id);
}
