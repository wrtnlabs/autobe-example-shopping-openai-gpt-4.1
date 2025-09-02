import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_cart_search_empty_result_handling(
  connection: api.IConnection,
) {
  /**
   * This E2E test ensures that when an authenticated admin queries the shopping
   * cart index endpoint with filters that yield no matching carts (or excessive
   * page numbers), the API returns correct empty results and pagination meta,
   * without errors or missing fields.
   *
   * 1. Create and authenticate an admin account.
   * 2. Search for carts with a status value that does not exist -- expect empty
   *    results.
   * 3. Search for carts by a random, non-existent customer_id -- expect empty
   *    results.
   * 4. Search for carts with an excessively high page number (e.g., 9999) --
   *    expect empty results.
   * 5. For each search, validate:
   *
   *    - The response contains a non-null 'pagination' object with numbers set as
   *         expected.
   *    - The response contains a 'data' array that is present and has length 0.
   *    - Total records/pages are zero where applicable for no-match scenarios.
   *    - The overall structure always matches the type specification (using
   *         typia.assert()).
   */

  // Step 1: Create and authenticate an admin account
  const adminJoinInput = {
    username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(8)}@autobetest.local`,
    is_active: true,
    phone_number: null,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // Token is set in connection.headers.Authorization automatically

  // Step 2: Search with status that does not exist
  const nonexistentStatus = `doesnotexist_${RandomGenerator.alphaNumeric(8)}`;
  const outStatus =
    await api.functional.shoppingMallAiBackend.admin.carts.index(connection, {
      body: {
        status: nonexistentStatus,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(outStatus);
  TestValidator.equals(
    "status filter no match => empty data",
    outStatus.data,
    [],
  );
  TestValidator.predicate(
    "status filter no match => records=0",
    outStatus.pagination.records === 0,
  );
  TestValidator.predicate(
    "status filter no match => pages=0",
    outStatus.pagination.pages === 0,
  );

  // Step 3: Search with unknown customer_id
  const unknownCustomerId = typia.random<string & tags.Format<"uuid">>();
  const outCustomerId =
    await api.functional.shoppingMallAiBackend.admin.carts.index(connection, {
      body: {
        customer_id: unknownCustomerId,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(outCustomerId);
  TestValidator.equals(
    "customer_id filter no match => empty data",
    outCustomerId.data,
    [],
  );
  TestValidator.predicate(
    "customer_id filter no match => records=0",
    outCustomerId.pagination.records === 0,
  );
  TestValidator.predicate(
    "customer_id filter no match => pages=0",
    outCustomerId.pagination.pages === 0,
  );

  // Step 4: Search with excessive page number
  const outExcessivePage =
    await api.functional.shoppingMallAiBackend.admin.carts.index(connection, {
      body: { page: 9999 } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(outExcessivePage);
  TestValidator.equals(
    "excessive page => empty data",
    outExcessivePage.data,
    [],
  );
  TestValidator.predicate(
    "excessive page => records=0 or data.length=0",
    outExcessivePage.pagination.records === 0 ||
      outExcessivePage.data.length === 0,
  );

  // Structure always valid and non-null for these cases per spec
}
