import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

/**
 * Test the happy path scenario of updating a product inventory by a seller.
 *
 * This test validates that a seller can: (1) register and receive an
 * authenticated session, (2) create a product as that seller, (3) create an
 * inventory record for that product, and (4) successfully update the
 * inventory record using the update endpoint.
 *
 * The flow ensures the seller account is properly registered and authorized
 * before product and inventory operations. After updating, the test asserts
 * that the returned inventory response matches the update input (for the
 * updated fields) and preserves correct references (such as product ID,
 * inventory ID). All API responses are runtime type asserted for safety.
 * Random, type-conforming data is generated for all creations to maximize
 * test coverage. The test also checks that fields which are not updated
 * remain unchanged in the inventory record after the update operation.
 *
 * Steps:
 *
 * 1. Register (join) a new seller and acquire authentication context.
 * 2. Create a product as this seller (with required product properties).
 * 3. Create an inventory record for the product with concrete values.
 * 4. Prepare an update input with changed values for at least one updatable
 *    field (e.g., available_quantity, reserved_quantity, inventory_status,
 *    last_update_at).
 * 5. Update the inventory record, authenticated as the seller.
 * 6. Assert that the updated inventory record reflects the input changes and
 *    that critical fields like product linkage and inventory ID remain
 *    correct and unchanged unless explicitly modified.
 */
export async function test_api_seller_product_inventory_update_happy_path(
  connection: api.IConnection,
) {
  // 1. Register/join as seller
  const sellerCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerCreateInput,
  });
  typia.assert(sellerAuth);

  // 2. Create a product as the seller
  const productCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(16), // guarantee uniqueness
    description: RandomGenerator.paragraph({ sentences: 8 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "bundle",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productCreateInput },
    );
  typia.assert(product);

  // 3. Create initial inventory record for the product
  const inventoryCreateInput = {
    available_quantity: 25,
    reserved_quantity: 3,
    last_update_at: new Date().toISOString(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "out_of_stock",
      "reserved",
      "discontinued",
    ] as const),
  } satisfies IShoppingMallAiBackendProductInventory.ICreate;
  const inventory =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.create(
      connection,
      { productId: product.id, body: inventoryCreateInput },
    );
  typia.assert(inventory);

  // 4. Prepare update - change available_quantity, add to reserved_quantity, change status, and update timestamp
  const updateInput = {
    available_quantity: inventory.available_quantity + 10,
    reserved_quantity: inventory.reserved_quantity + 2,
    inventory_status:
      inventory.inventory_status === "in_stock" ? "reserved" : "in_stock",
    last_update_at: new Date(Date.now() + 60_000).toISOString(), // 1 minute ahead
  } satisfies IShoppingMallAiBackendProductInventory.IUpdate;

  // 5. Update the inventory record
  const updated =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.update(
      connection,
      {
        productId: product.id,
        inventoryId: typia.assert<string & tags.Format<"uuid">>(inventory.id),
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 6. Assert the updated output reflects the changes
  TestValidator.equals(
    "updated available_quantity",
    updated.available_quantity,
    updateInput.available_quantity,
  );
  TestValidator.equals(
    "updated reserved_quantity",
    updated.reserved_quantity,
    updateInput.reserved_quantity,
  );
  TestValidator.equals(
    "updated status",
    updated.inventory_status,
    updateInput.inventory_status,
  );
  TestValidator.equals(
    "updated last_update_at",
    updated.last_update_at,
    updateInput.last_update_at,
  );
  // Confirm unchanged fields are preserved
  TestValidator.equals(
    "product linkage unchanged",
    updated.shopping_mall_ai_backend_products_id,
    inventory.shopping_mall_ai_backend_products_id,
  );
  TestValidator.equals("inventory id unchanged", updated.id, inventory.id);
}
