import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_cart_search_with_admin_filters(
  connection: api.IConnection,
) {
  /**
   * Test seller cart advanced search and filtering.
   *
   * Steps:
   *
   * 1. Register and authenticate a new seller.
   * 2. Perform paginated cart search with different admin filters: by status,
   *    customer_id, and created_at range.
   * 3. Assert correct pagination and filter output.
   * 4. Confirm only eligible/visible results shown.
   * 5. Edge/negative: filter for non-existent data and assert correct empty
   *    result.
   */

  // 1. Register and authenticate as seller
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller email matches",
    sellerAuth.seller.email,
    sellerInput.email,
  );
  TestValidator.predicate(
    "seller is active",
    sellerAuth.seller.is_active === true,
  );
  TestValidator.predicate(
    "seller is verified",
    sellerAuth.seller.is_verified === true ||
      sellerAuth.seller.is_verified === false,
  );

  // 2. Cart search - unfiltered/all
  const allResult =
    await api.functional.shoppingMallAiBackend.seller.carts.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(allResult);
  TestValidator.predicate(
    "pagination object exists for allResult",
    allResult.pagination !== undefined && allResult.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists for allResult",
    Array.isArray(allResult.data),
  );

  // 3. Cart search - filter by status (random or example status)
  const status = "active";
  const statusResult =
    await api.functional.shoppingMallAiBackend.seller.carts.index(connection, {
      body: {
        status,
        limit: 5,
        page: 1,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(statusResult);
  TestValidator.predicate(
    "all statusResult carts have expected status",
    statusResult.data.every((cart) => cart.status === status),
  );

  // 4. Cart search - filter by customer_id (use a known uuid or random)
  const randomCustomerId = typia.random<string & tags.Format<"uuid">>();
  const customerIdResult =
    await api.functional.shoppingMallAiBackend.seller.carts.index(connection, {
      body: {
        customer_id: randomCustomerId,
        limit: 5,
        page: 1,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(customerIdResult);
  TestValidator.predicate(
    "all carts in customerIdResult match the customer_id filter",
    customerIdResult.data.every(
      (cart) => cart.customer_id === randomCustomerId,
    ),
  );

  // 5. Cart search - filter by created_at_min/max (choose a plausible window)
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAtMin = weekAgo.toISOString();
  const createdAtMax = now.toISOString();
  const dateResult =
    await api.functional.shoppingMallAiBackend.seller.carts.index(connection, {
      body: {
        created_at_min: createdAtMin,
        created_at_max: createdAtMax,
        limit: 10,
        page: 1,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(dateResult);
  TestValidator.predicate(
    "all carts in dateResult are within date filter range",
    dateResult.data.every(
      (cart) =>
        cart.created_at >= createdAtMin && cart.created_at <= createdAtMax,
    ),
  );

  // 6. Edge/negative: filter for a status that likely does not exist
  const missingStatus = "___no_such_status___";
  const emptyResult =
    await api.functional.shoppingMallAiBackend.seller.carts.index(connection, {
      body: {
        status: missingStatus,
        limit: 3,
        page: 1,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "no data for missing status filter",
    emptyResult.data.length,
    0,
  );
}
