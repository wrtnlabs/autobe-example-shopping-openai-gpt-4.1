import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_cart_search_filters_and_pagination_edges(
  connection: api.IConnection,
) {
  /**
   * Test shopping cart search endpoint filtering and pagination edge cases:
   *
   * 1. Register a customer account (via /auth/customer/join)
   * 2. Perform PATCH /shoppingMallAiBackend/customer/carts searches with:
   *
   *    - Status filter (including known, unknown, random, and "nonexistent" values)
   *    - Date range filters for empty and non-empty result sets
   *    - Pagination edge cases: very small/large page/limit, missing/zero values
   *    - Filtering by current customer_id
   *    - Filters with unknown/non-matching session_id and note_search
   * 3. Validate both response shape (pagination fields, array structure, type
   *    assertions)
   * 4. Assert correct empty/non-empty array responses, expected data/pagination
   *    integrity, and consistent ownership on ownership filter
   * 5. Check result summary fields: proper types and formats for id, created_at,
   *    status, etc.
   */

  // 1. Register customer and get customer_id
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(2),
    nickname: RandomGenerator.name(1),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customerId = auth.customer.id;

  // 2. Search by various status filters (including edge/nonexistent)
  const statusCases = [
    "active",
    "submitted",
    "nonexistent",
    RandomGenerator.alphaNumeric(8),
  ] as const;
  for (const status of statusCases) {
    const res = await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: { status } satisfies IShoppingMallAiBackendCart.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.predicate(
      `status filter [${status}] returns valid pagination`,
      typeof res.pagination.current === "number" &&
        typeof res.pagination.limit === "number",
    );
    TestValidator.predicate(
      `status filter [${status}] returns data array`,
      Array.isArray(res.data),
    );
  }

  // 3. Date range filter tests
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const windows = [
    // Very old-to-old (likely empty)
    { min: weekAgo.toISOString(), max: weekAgo.toISOString() },
    // Current day
    { min: now.toISOString(), max: now.toISOString() },
  ];
  for (const w of windows) {
    const res = await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: {
          created_at_min: w.min,
          created_at_max: w.max,
        } satisfies IShoppingMallAiBackendCart.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.predicate(
      `created_at [${w.min}~${w.max}] returns array`,
      Array.isArray(res.data),
    );
  }

  // 4. Pagination edge cases
  const paginationCases = [
    { page: 1, limit: 1 },
    { page: 1, limit: 999 },
    { page: 999, limit: 1 },
    { page: 0, limit: 0 },
    {},
  ];
  for (const p of paginationCases) {
    const res = await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: { ...p } satisfies IShoppingMallAiBackendCart.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.predicate(
      `pagination returns nonnegative count for page=${p.page ?? "default"}, limit=${p.limit ?? "default"}`,
      res.data.length >= 0 &&
        typeof res.pagination.current === "number" &&
        typeof res.pagination.limit === "number",
    );
  }

  // 5. Filter by customer_id (returned carts should all be this customer)
  const mine = await api.functional.shoppingMallAiBackend.customer.carts.index(
    connection,
    {
      body: {
        customer_id: customerId,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    },
  );
  typia.assert(mine);
  for (const cart of mine.data) {
    TestValidator.equals(
      "cart.customer_id matches customer",
      cart.customer_id,
      customerId,
    );
  }

  // 6. Unknown filter keys and non-matching filters (random session_id, note_search)
  const fakeSession = typia.random<string & tags.Format<"uuid">>();
  const fakeNote = RandomGenerator.alphaNumeric(16);
  const filterTests = [
    { session_id: fakeSession },
    { note_search: fakeNote },
    { status: "doesnotexist" },
  ];
  for (const filter of filterTests) {
    const res = await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: filter as IShoppingMallAiBackendCart.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.predicate(
      `unknown filter ${JSON.stringify(filter)} returns array`,
      Array.isArray(res.data),
    );
    TestValidator.predicate(
      `unknown filter ${JSON.stringify(filter)} has valid pagination`,
      typeof res.pagination.current === "number",
    );
  }

  // 7. Validate summary data structure
  const result =
    await api.functional.shoppingMallAiBackend.customer.carts.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendCart.IRequest,
      },
    );
  typia.assert(result);
  for (const cart of result.data) {
    TestValidator.predicate(
      "cart.id is uuid string",
      typeof cart.id === "string" && cart.id.length > 0,
    );
    TestValidator.predicate(
      "cart.status is string",
      typeof cart.status === "string",
    );
    TestValidator.predicate(
      "created_at is ISO 8601 date-time",
      typeof cart.created_at === "string" && cart.created_at.includes("T"),
    );
  }
}
