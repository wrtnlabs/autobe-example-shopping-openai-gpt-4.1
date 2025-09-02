import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_admin_create_inventory_success(
  connection: api.IConnection,
) {
  /**
   * Validate that an admin can successfully create a new inventory record for a
   * specific product.
   *
   * Business flow:
   *
   * 1. Register a new admin using /auth/admin/join endpoint (authentication is
   *    established for subsequent admin APIs).
   * 2. Use a random, valid productId (as product creation is unavailable in
   *    current test scope).
   * 3. Create a valid inventory via
   *    /shoppingMallAiBackend/admin/products/{productId}/inventories, providing
   *    correct fields.
   * 4. Type-validate the response and verify business logic: linkage to productId,
   *    available and reserved quantities, correct status.
   *
   * Edge/failure flows, and actual product creation setup, are omitted due to
   * test scenario scope.
   */

  // Step 1: Register a new admin and authenticate
  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(60),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(adminAuth);

  // Step 2: Simulate a valid productId (since product creation endpoint is unavailable)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Prepare inventory creation data for the given product
  const inventoryCreateData = {
    available_quantity: typia.random<number & tags.Type<"int32">>(),
    reserved_quantity: typia.random<number & tags.Type<"int32">>(),
    last_update_at: new Date().toISOString(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "reserved",
      "out_of_stock",
      "discontinued",
    ] as const),
  } satisfies IShoppingMallAiBackendProductInventory.ICreate;

  // Step 4: Create inventory
  const output =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.create(
      connection,
      {
        productId,
        body: inventoryCreateData,
      },
    );
  typia.assert(output);

  // Step 5: Business result validations
  TestValidator.equals(
    "inventory record linked to correct productId",
    output.shopping_mall_ai_backend_products_id,
    productId,
  );
  TestValidator.equals(
    "correct available_quantity set",
    output.available_quantity,
    inventoryCreateData.available_quantity,
  );
  TestValidator.equals(
    "correct reserved_quantity set",
    output.reserved_quantity,
    inventoryCreateData.reserved_quantity,
  );
  TestValidator.equals(
    "correct inventory_status set",
    output.inventory_status,
    inventoryCreateData.inventory_status,
  );
}
