import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_admin_product_inventory_delete_not_found(
  connection: api.IConnection,
) {
  /**
   * Scenario: Deleting a non-existent product inventory as admin.
   *
   * This test validates backend error handling and data consistency by
   * simulating an admin's attempt to remove a product inventory record that
   * does not actually exist. Steps:
   *
   * 1. Register an admin using unique, random test information. This sets up
   *    authentication and authorization context for API calls needing 'admin'
   *    privileges.
   * 2. Create a product for context—this ensures the referenced product exists
   *    when testing the inventory delete endpoint.
   * 3. Attempt to delete a product inventory specifying the real productId but
   *    passing a random (guaranteed non-existent) inventoryId.
   * 4. Assert that the system returns a not found (404) error, and no product data
   *    is deleted or changed.
   * 5. Optionally: Verify the product itself still exists after the failed delete
   *    operation, ensuring no cross-entity side-effects occurred. (Skipped due
   *    to SDK limits.)
   */

  // 1. Admin registration (authentication context)
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin registration succeeds and returns authorized admin",
    adminAuth.admin && adminAuth.token && adminAuth.admin.is_active === true,
  );

  // 2. Admin creates a product (for minimal context)
  const productCreateInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.content({ paragraphs: 1 }),
    product_type: RandomGenerator.alphabets(8),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productCreateInput },
    );
  typia.assert(product);
  TestValidator.equals(
    "created product is active",
    product.business_status,
    "active",
  );

  // 3. Attempt to delete a non-existent inventory record
  const invalidInventoryId = typia.random<string & tags.Format<"uuid">>(); // Very likely to not exist
  await TestValidator.httpError(
    "deleting a non-existent product inventory returns 404",
    404,
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.inventories.erase(
        connection,
        {
          productId: product.id,
          inventoryId: invalidInventoryId,
        },
      );
    },
  );
  // 4. Ensure the product still exists: No re-query endpoint available, so cannot verify further.
}
