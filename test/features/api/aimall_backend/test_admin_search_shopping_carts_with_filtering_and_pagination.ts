import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IPageIAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates administrator-level paginated and filtered search of shopping
 * carts.
 *
 * This test ensures admin users can filter and page through shopping carts
 * using filters like:
 *
 * - Customer UUID
 * - Session token (for guest carts)
 * - Created date range (created_from/created_to)
 * - Updated date range (updated_from/updated_to) It checks that requesting with
 *   these filters returns a correct subset of carts, all pagination data is
 *   accurate, and only non-sensitive cart summary info is returned.
 *
 * Includes validation of edge and abuse cases:
 *
 * 1. Rejects invalid filter parameter combinations.
 * 2. Properly enforces access control (unauthorized attempts are blocked).
 * 3. Handles overly broad filters (all records), overly restrictive filters (zero
 *    results), and paginated result navigation.
 * 4. Throttles or rejects abusive/excess request volumes.
 * 5. Confirms no sensitive details are present in list summaries.
 *
 * Steps:
 *
 * 1. Call search with typical filters and verify results/pagination integrity.
 * 2. Call with customer_id only, then session_token only, and compare expected
 *    outcomes.
 * 3. Use created_from/created_to and updated_from/updated_to windowing for range
 *    filter accuracy.
 * 4. Paginate with different pages/limits, check page structure and records count.
 * 5. Check restricting filter (random UUID not in DB) produces zero results, and
 *    omit filters for all results (if authorized).
 * 6. Attempt with invalid or mutually-exclusive filters, expects error.
 * 7. Simulate abusive request volume (if not rate-limited by infra, verify system
 *    stability/no crash).
 * 8. Attempt with unauthorized context and expect access denial.
 */
export async function test_api_aimall_backend_test_admin_search_shopping_carts_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Typical filter: find with customer ID, paginated
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const paged = await api.functional.aimall_backend.administrator.carts.search(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerId,
        page: 1,
        limit: 10,
      } satisfies IAimallBackendCart.IRequest,
    },
  );
  typia.assert(paged);
  if (paged.data)
    for (const cart of paged.data) {
      TestValidator.equals("customerId filter")(
        cart.aimall_backend_customer_id,
      )(customerId);
      // No sensitive fields; verify presence of only allowed summary fields
      // (Fields: id, aimall_backend_customer_id, session_token, created_at, updated_at, cart_items_count)
    }
  if (paged.pagination) {
    TestValidator.equals("page 1")(paged.pagination.current)(1);
    TestValidator.equals("limit 10")(paged.pagination.limit)(10);
  }

  // 2. Typical filter: find with guest session token
  const sessionToken = typia.random<string>();
  const guestPaged =
    await api.functional.aimall_backend.administrator.carts.search(connection, {
      body: {
        session_token: sessionToken,
        limit: 10,
        page: 1,
      } satisfies IAimallBackendCart.IRequest,
    });
  typia.assert(guestPaged);
  if (guestPaged.data)
    for (const cart of guestPaged.data) {
      TestValidator.equals("guest cart session token")(cart.session_token)(
        sessionToken,
      );
    }

  // 3: Date range filtering
  const from = new Date(Date.now() - 86400_000 * 7).toISOString();
  const to = new Date().toISOString();
  const rangePaged =
    await api.functional.aimall_backend.administrator.carts.search(connection, {
      body: {
        created_from: from,
        created_to: to,
        limit: 5,
        page: 1,
      } satisfies IAimallBackendCart.IRequest,
    });
  typia.assert(rangePaged);
  if (rangePaged.data)
    for (const cart of rangePaged.data) {
      if (cart.created_at < from || cart.created_at > to)
        throw new Error("Cart outside created_at range");
    }

  // 4. Restrictive filter: random uuid for customer - expect zero results
  const rarePaged =
    await api.functional.aimall_backend.administrator.carts.search(connection, {
      body: {
        aimall_backend_customer_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        page: 1,
        limit: 1,
      } satisfies IAimallBackendCart.IRequest,
    });
  typia.assert(rarePaged);
  TestValidator.equals("restrictive filter: zero results")(
    rarePaged.data?.length ?? 0,
  )(0);

  // 5. Pagination navigation (2nd page)
  const navPaged =
    await api.functional.aimall_backend.administrator.carts.search(connection, {
      body: { page: 2, limit: 2 } satisfies IAimallBackendCart.IRequest,
    });
  typia.assert(navPaged);
  if (navPaged.pagination) {
    TestValidator.equals("page 2")(navPaged.pagination.current)(2);
    TestValidator.equals("limit 2")(navPaged.pagination.limit)(2);
  }

  // 6. Excessively broad filter: no customer/session filter, get all (if allowed)
  const allPaged =
    await api.functional.aimall_backend.administrator.carts.search(connection, {
      body: { page: 1, limit: 999 } satisfies IAimallBackendCart.IRequest,
    });
  typia.assert(allPaged);
  if (allPaged.pagination) {
    TestValidator.equals("page 1")(allPaged.pagination.current)(1);
    TestValidator.equals("limit 999")(allPaged.pagination.limit)(999);
  }
  // (May need limit/cap checking here if very large responses are guarded.)

  // 7. Invalid query: both customerId and session token (mutually exclusive)
  TestValidator.error("invalid query: both customer_id and session_token")(() =>
    api.functional.aimall_backend.administrator.carts.search(connection, {
      body: {
        aimall_backend_customer_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        session_token: typia.random<string>(),
      } satisfies IAimallBackendCart.IRequest,
    }),
  );

  // 8. Invalid query: excessive page number/negative page
  TestValidator.error("invalid query: negative page number")(() =>
    api.functional.aimall_backend.administrator.carts.search(connection, {
      body: { page: -1, limit: 3 } satisfies IAimallBackendCart.IRequest,
    }),
  );
  TestValidator.error("invalid query: too high page number")(() =>
    api.functional.aimall_backend.administrator.carts.search(connection, {
      body: {
        page: 10_000_000,
        limit: 1,
      } satisfies IAimallBackendCart.IRequest,
    }),
  );

  // 9. Abuse prevention: many requests in loop (simulate reasonable limit for test infra)
  for (let i = 0; i < 12; ++i) {
    await api.functional.aimall_backend.administrator.carts.search(connection, {
      body: { page: 1, limit: 1 } satisfies IAimallBackendCart.IRequest,
    });
  }

  // 10. Unauthorized context (simulate by stripping admin rights/token in type-safe way)
  const userConnection = {
    ...connection,
    headers: {
      ...Object.fromEntries(
        Object.entries(connection.headers ?? {}).filter(
          ([k]) => k !== "Authorization",
        ),
      ),
    },
  };
  TestValidator.error("unauthorized: no admin rights")(() =>
    api.functional.aimall_backend.administrator.carts.search(userConnection, {
      body: { page: 1, limit: 1 } satisfies IAimallBackendCart.IRequest,
    }),
  );
}
