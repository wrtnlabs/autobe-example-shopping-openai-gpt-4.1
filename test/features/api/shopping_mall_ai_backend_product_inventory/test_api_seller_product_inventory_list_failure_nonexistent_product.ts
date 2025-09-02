import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import type { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_inventory_list_failure_nonexistent_product(
  connection: api.IConnection,
) {
  /**
   * Test seller inventory listing for a non-existent product.
   *
   * This test ensures:
   *
   * - Seller registration and authentication via /auth/seller/join.
   * - Inventory query for a random productId that is guaranteed not to exist.
   * - API either returns an empty inventory page (no records, no data) or throws
   *   a handled/expected error (e.g., 404 Not Found).
   * - There is no data leakage, and business logic for nonexistent product
   *   inventory is robust.
   *
   * Steps:
   *
   * 1. Register a new seller using the join endpoint and acquire authentication.
   * 2. Generate a random UUID for productId that does not match any real/created
   *    product.
   * 3. Send a PATCH request to
   *    /shoppingMallAiBackend/seller/products/{productId}/inventories using
   *    this fake productId with an empty/blank request body.
   * 4. Branch:
   *
   *    - If the API returns empty page, confirm data and record count are zero.
   *    - If the API throws, catch error and assert this is considered valid for this
   *         scenario (prevent test fail).
   * 5. There must be no unauthorized information leak regardless of branch.
   */

  // 1. Register and authenticate as a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Generate a fresh, random UUID for a nonexistent product
  const nonexistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt inventory listing for nonexistent product
  let result: IPageIShoppingMallAiBackendProductInventory | undefined =
    undefined;
  let exceptionOccurred = false;
  try {
    result =
      await api.functional.shoppingMallAiBackend.seller.products.inventories.index(
        connection,
        {
          productId: nonexistentProductId,
          body: {} satisfies IShoppingMallAiBackendProductInventory.IRequest,
        },
      );
    typia.assert(result);
  } catch (err) {
    exceptionOccurred = true;
    TestValidator.predicate(
      "API throws an error for nonexistent productId inventory request (acceptable)",
      exceptionOccurred,
    );
  }
  // 4. If no error, ensure result page is empty and records is zero
  if (!exceptionOccurred) {
    TestValidator.equals(
      "Inventory page data should be empty for nonexistent productId",
      result!.data.length,
      0,
    );
    TestValidator.equals(
      "Inventory page should report zero records for nonexistent productId",
      result!.pagination.records,
      0,
    );
  }
}
