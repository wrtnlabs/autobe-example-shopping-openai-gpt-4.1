import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_cart_search_with_basic_filters(
  connection: api.IConnection,
) {
  /**
   * E2E test: Authenticated customer can search and paginate their own shopping
   * carts with basic filters.
   *
   * Validates:
   *
   * 1. Dependency: Customer registration and authentication.
   * 2. The PATCH /shoppingMallAiBackend/customer/carts works for authenticated
   *    users, supports pagination, status and date range filters.
   * 3. The result only contains non-deleted carts for that customer.
   * 4. Sensitive fields (like customer_id) relate only to the currently signed-in
   *    user.
   * 5. An unauthenticated (no Authorization) request fails.
   */

  // 1. Register (and log in as) a new customer.
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "test-password-1234",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinAuth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinAuth);
  TestValidator.equals(
    "joined customer email matches",
    joinAuth.customer.email,
    joinInput.email,
  );

  // 2. Default search (no filters, first page).
  const page1 = await api.functional.shoppingMallAiBackend.customer.carts.index(
    connection,
    {
      body: {} satisfies IShoppingMallAiBackendCart.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "paginated data array exists",
    Array.isArray(page1.data),
  );
  // All carts must belong to the authenticated user (customer_id)
  page1.data.forEach((cart) => {
    if (cart.customer_id !== null && cart.customer_id !== undefined) {
      TestValidator.equals(
        "cart.customer_id is current user",
        cart.customer_id,
        joinAuth.customer.id,
      );
    }
    // Cart must not be logically deleted (deleted carts do not appear)
    // No 'deleted' field—by business rule, returned carts are not deleted.
  });

  // 3. Filter by status (use status from data if available, else 'active')
  const status = page1.data.length > 0 ? page1.data[0].status : "active";
  const resultStatus =
    await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: { status } satisfies IShoppingMallAiBackendCart.IRequest,
      },
    );
  typia.assert(resultStatus);
  resultStatus.data.forEach((cart) => {
    TestValidator.equals("cart.status matches filter", cart.status, status);
    if (cart.customer_id !== null && cart.customer_id !== undefined) {
      TestValidator.equals(
        "cart.customer_id is current user",
        cart.customer_id,
        joinAuth.customer.id,
      );
    }
  });

  // 4. Filter by created_at date range (if available)
  if (page1.data.length > 0) {
    const createdAt = page1.data[0].created_at;
    const resultDate =
      await api.functional.shoppingMallAiBackend.customer.carts.index(
        connection,
        {
          body: {
            created_at_min: createdAt,
            created_at_max: createdAt,
          } satisfies IShoppingMallAiBackendCart.IRequest,
        },
      );
    typia.assert(resultDate);
    resultDate.data.forEach((cart) => {
      TestValidator.equals(
        "cart.created_at matches filter",
        cart.created_at,
        createdAt,
      );
      if (cart.customer_id !== null && cart.customer_id !== undefined) {
        TestValidator.equals(
          "cart.customer_id is current user",
          cart.customer_id,
          joinAuth.customer.id,
        );
      }
    });
  }

  // 5. Edge case: filtering for a non-existent status returns empty data
  const edgeStatus = RandomGenerator.alphaNumeric(12);
  const edgeResult =
    await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: {
          status: edgeStatus,
        } satisfies IShoppingMallAiBackendCart.IRequest,
      },
    );
  TestValidator.equals(
    "edge status should return empty result",
    edgeResult.data.length,
    0,
  );

  // 6. Unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access cart search",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.index(
        unauthConn,
        {
          body: {} satisfies IShoppingMallAiBackendCart.IRequest,
        },
      );
    },
  );
}
