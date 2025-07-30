import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test the full workflow for creating an inventory snapshot for a SKU by an
 * administrator.
 *
 * This test covers:
 *
 * 1. Product creation (for SKU attachment)
 * 2. SKU creation under the created product
 * 3. Snapshot creation for the SKU (inventory change event)
 * 4. Validation of returned data structure and integrity
 *
 * Steps:
 *
 * 1. Create a new product with valid category_id, seller_id, title, and status.
 * 2. Create a SKU assigned to the created product, with a unique sku_code.
 * 3. Submit a valid POST to the SKU's inventorySnapshots endpoint with proper
 *    fields (sku_id, product_id, change_type, change_quantity, changed_by).
 * 4. Assert that the returned snapshot includes all provided fields and matches
 *    the SKU/product context, with correct types and values.
 * 5. Confirm the returned snapshot contains a generated id and creation timestamp.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_create_inventory_snapshot_success_for_sku(
  connection: api.IConnection,
) {
  // 1. Create a product as an admin
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const productInput = {
    category_id,
    seller_id,
    title: "Inventory Test Product " + RandomGenerator.alphaNumeric(8),
    status: "active",
    description: "Test product for inventory snapshot workflow.",
    // main_thumbnail_uri omitted (optional)
  } satisfies IAimallBackendProduct.ICreate;

  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 2. Create a SKU under the product
  const sku_code = "SKU-" + RandomGenerator.alphaNumeric(12);
  const skuInput = {
    product_id: product.id,
    sku_code,
  } satisfies IAimallBackendSku.ICreate;

  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      { productId: product.id, body: skuInput },
    );
  typia.assert(sku);

  // 3. Create the inventory snapshot for the SKU
  const change_type = "restock";
  const change_quantity = 25;
  const changed_by = typia.random<string & tags.Format<"uuid">>(); // acting admin

  const snapshotInput = {
    sku_id: sku.id,
    product_id: product.id,
    change_type,
    change_quantity,
    changed_by,
  } satisfies IAimallBackendInventorySnapshot.ICreate;

  const snapshot =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      { skuId: sku.id, body: snapshotInput },
    );
  typia.assert(snapshot);

  // 4. Validate returned snapshot matches input context
  TestValidator.equals("sku_id")(snapshot.sku_id)(sku.id);
  TestValidator.equals("product_id")(snapshot.product_id)(product.id);
  TestValidator.equals("change_type")(snapshot.change_type)(change_type);
  TestValidator.equals("change_quantity")(snapshot.change_quantity)(
    change_quantity,
  );
  TestValidator.equals("changed_by")(snapshot.changed_by)(changed_by);

  // 5. Confirm snapshot.id and created_at exist and are well-formed
  TestValidator.predicate("snapshot id exists")(
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.predicate("created_at format")(
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );
}
