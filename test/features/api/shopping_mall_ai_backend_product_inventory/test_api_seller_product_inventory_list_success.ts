import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import type { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_inventory_list_success(
  connection: api.IConnection,
) {
  /**
   * Test retrieving a paginated and filterable inventory list for a seller's
   * product.
   *
   * 1. Register and authenticate seller via /auth/seller/join
   *    (IShoppingMallAiBackendSeller.ICreate, sets Authorization).
   * 2. Simulate an existing product for this seller; assign a random UUID (since
   *    no product creation API is provided).
   * 3. Construct a random inventory list filter body
   *    (IShoppingMallAiBackendProductInventory.IRequest) simulating query
   *    params.
   * 4. Call PATCH /shoppingMallAiBackend/seller/products/{productId}/inventories
   *    with simulated productId and filter body.
   * 5. Assert response is IPageIShoppingMallAiBackendProductInventory and confirm
   *    all inventory records reference productId.
   * 6. Validate all pagination fields (current, limit, pages, records) exist and
   *    are integers.
   * 7. For every data[] entry, validate .shopping_mall_ai_backend_products_id ===
   *    productId.
   */

  // 1. Register seller and authenticate (sets Authorization in connection automatically)
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Simulate an existing product for this seller
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Build request body for inventory listing (supports all filters, page, limit)
  const requestBody =
    typia.random<IShoppingMallAiBackendProductInventory.IRequest>();

  // 4. Request inventory list for the simulated product
  const output =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.index(
      connection,
      {
        productId,
        body: requestBody,
      },
    );
  typia.assert(output);

  // 5. Validate response shape and productId linkage
  TestValidator.predicate(
    "Result is a paginated page object with data array",
    Array.isArray(output.data) && typeof output.pagination === "object",
  );
  TestValidator.predicate(
    "All inventory entries reference the requested productId",
    output.data.every(
      (inv) => inv.shopping_mall_ai_backend_products_id === productId,
    ),
  );

  // 6. Validate pagination fields
  TestValidator.predicate(
    "Pagination current is integer",
    Number.isInteger(output.pagination.current),
  );
  TestValidator.predicate(
    "Pagination limit is integer",
    Number.isInteger(output.pagination.limit),
  );
  TestValidator.predicate(
    "Pagination pages is integer",
    Number.isInteger(output.pagination.pages),
  );
  TestValidator.predicate(
    "Pagination records is integer",
    Number.isInteger(output.pagination.records),
  );

  // 7. If any results are returned, check inventory structure
  output.data.forEach((inv) => {
    TestValidator.equals(
      "Inventory record product ID matches requested productId",
      inv.shopping_mall_ai_backend_products_id,
      productId,
    );
    TestValidator.predicate(
      "Inventory record has integer available_quantity",
      Number.isInteger(inv.available_quantity),
    );
    TestValidator.predicate(
      "Inventory record has integer reserved_quantity",
      Number.isInteger(inv.reserved_quantity),
    );
    TestValidator.predicate(
      "Inventory record has a last_update_at datetime",
      typeof inv.last_update_at === "string" && inv.last_update_at.length > 0,
    );
    TestValidator.predicate(
      "Inventory record has inventory_status string",
      typeof inv.inventory_status === "string" &&
        inv.inventory_status.length > 0,
    );
  });
}
