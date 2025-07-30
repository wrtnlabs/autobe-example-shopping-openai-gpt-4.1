import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Validate successful update of an inventory snapshot by administrator.
 *
 * This test ensures that an administrator can update an existing inventory
 * snapshot for a SKU. The process involves creating all dependencies:
 *
 * 1. Create a product.
 * 2. Add a SKU to the product.
 * 3. Log an inventory snapshot for the created SKU.
 * 4. Use PUT endpoint to update editable fields on the inventory snapshot (such as
 *    change_type and change_quantity).
 * 5. Confirm the response reflects the updated values and type structure is
 *    correct.
 * 6. (Optional) Re-query if possible to check persistence (not required here since
 *    GET endpoint is not provided).
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_update_inventory_snapshot_success(
  connection: api.IConnection,
) {
  // 1. Create a product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(3),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 2. Create a SKU for the product
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(12),
  };
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      { productId: product.id, body: skuInput },
    );
  typia.assert(sku);

  // 3. Log an inventory snapshot for the SKU
  const snapshotInput: IAimallBackendInventorySnapshot.ICreate = {
    sku_id: sku.id,
    product_id: product.id,
    change_type: "manual_adjust",
    change_quantity: 20,
    changed_by: typia.random<string & tags.Format<"uuid">>(),
  };
  const snapshot =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      { skuId: sku.id, body: snapshotInput },
    );
  typia.assert(snapshot);

  // Save old values for assertion
  const old_change_type = snapshot.change_type;
  const old_change_quantity = snapshot.change_quantity;

  // 4. Use PUT to update editable fields (change_type, change_quantity)
  const updateInput: IAimallBackendInventorySnapshot.IUpdate = {
    change_type: old_change_type !== "restock" ? "restock" : "manual_adjust",
    change_quantity: old_change_quantity + 5,
  };
  const updated =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.update(
      connection,
      { skuId: sku.id, inventorySnapshotId: snapshot.id, body: updateInput },
    );
  typia.assert(updated);

  // 5. Make sure updated fields reflect changes
  TestValidator.equals("SKU unchanged")(updated.sku_id)(snapshot.sku_id);
  TestValidator.equals("Product unchanged")(updated.product_id)(
    snapshot.product_id,
  );
  TestValidator.equals("Updated change_type")(updated.change_type)(
    updateInput.change_type,
  );
  TestValidator.equals("Updated change_quantity")(updated.change_quantity)(
    updateInput.change_quantity,
  );
  TestValidator.notEquals("Updated fields differ from old")(
    updated.change_type,
  )(old_change_type);
  TestValidator.notEquals("Updated fields differ from old")(
    updated.change_quantity,
  )(old_change_quantity);
}
