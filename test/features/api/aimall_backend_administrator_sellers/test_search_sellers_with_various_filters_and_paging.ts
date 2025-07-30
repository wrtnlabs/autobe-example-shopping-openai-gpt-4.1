import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IPageIAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates administrator search, filter, and pagination for sellers.
 *
 * This E2E test ensures an admin can search for sellers using partial business
 * name, status, and registration date range, including combined filters and
 * paging. It confirms only relevant results are returned and pagination is
 * accurate.
 *
 * Test Steps:
 *
 * 1. Create several sellers with varied business names, statuses, and created_at
 *    timestamps (for filter determinism)
 * 2. Search with a partial business name (e.g., "Alpha"); check all results match
 *    and irrelevants are excluded
 * 3. Filter by status; validate only status-matching sellers are returned
 * 4. Filter by registration date range; results must match date window
 * 5. Combine multiple filters; only intersection is returned
 * 6. Test pagination: limit/page meta consistency, correct slicing of result set
 * 7. Edge: out-of-bounds pagination returns empty with correct meta
 */
export async function test_api_aimall_backend_administrator_sellers_test_search_sellers_with_various_filters_and_paging(
  connection: api.IConnection,
) {
  // Step 1: Create diverse sellers
  const sellerFixtures = [
    {
      business_name: "AlphaTest Corp",
      email: typia.random<string & tags.Format<"email">>(),
      contact_phone: "010-1111-2222",
      status: "pending",
    },
    {
      business_name: "BetaBiz Solutions",
      email: typia.random<string & tags.Format<"email">>(),
      contact_phone: "010-3333-4444",
      status: "approved",
    },
    {
      business_name: "GammaShop International",
      email: typia.random<string & tags.Format<"email">>(),
      contact_phone: "010-5555-6666",
      status: "suspended",
    },
    {
      business_name: "AlphaWave Trading",
      email: typia.random<string & tags.Format<"email">>(),
      contact_phone: "010-1212-3434",
      status: "approved",
    },
    {
      business_name: "DeltaAlpha Logistics",
      email: typia.random<string & tags.Format<"email">>(),
      contact_phone: "010-5656-7878",
      status: "pending",
    },
  ] satisfies IAimallBackendSeller.ICreate[];
  const createdSellers: IAimallBackendSeller[] = [];
  for (const sellerInput of sellerFixtures) {
    const seller =
      await api.functional.aimall_backend.administrator.sellers.create(
        connection,
        {
          body: sellerInput,
        },
      );
    typia.assert(seller);
    createdSellers.push(seller);
  }

  // Step 2: Partial business_name filter ("Alpha")
  const respAlpha =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          business_name: "Alpha",
        },
      },
    );
  typia.assert(respAlpha);
  for (const s of respAlpha.data) {
    TestValidator.predicate("partial business_name matches")(
      s.business_name.includes("Alpha"),
    );
  }
  TestValidator.predicate("all results are created sellers")(
    respAlpha.data.every((s) => createdSellers.some((cs) => cs.id === s.id)),
  );

  // Step 3: Status filter ("approved")
  const respStatus =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(respStatus);
  for (const s of respStatus.data) {
    TestValidator.equals("status matches")(s.status)("approved");
  }

  // Step 4: Created_at range filtering
  // Derive a range covering a strict subset of created sellers
  const times = createdSellers
    .map((s) => new Date(s.created_at).getTime())
    .sort((a, b) => a - b);
  const midStart = new Date(times[1] - 1).toISOString();
  const midEnd = new Date(times[3] + 1).toISOString();
  const respDate =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          created_at_gte: midStart,
          created_at_lte: midEnd,
        },
      },
    );
  typia.assert(respDate);
  for (const s of respDate.data) {
    TestValidator.predicate("date range match")(
      new Date(s.created_at).getTime() >= new Date(midStart).getTime() &&
        new Date(s.created_at).getTime() <= new Date(midEnd).getTime(),
    );
  }

  // Step 5: Combination filter (business_name: "Alpha", status: "pending", created_at window)
  const respCombo =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          business_name: "Alpha",
          status: "pending",
          created_at_gte: midStart,
          created_at_lte: midEnd,
        },
      },
    );
  typia.assert(respCombo);
  for (const s of respCombo.data) {
    TestValidator.predicate("combo: business_name")(
      s.business_name.includes("Alpha"),
    );
    TestValidator.equals("combo: status")(s.status)("pending");
    TestValidator.predicate("combo: date range")(
      new Date(s.created_at).getTime() >= new Date(midStart).getTime() &&
        new Date(s.created_at).getTime() <= new Date(midEnd).getTime(),
    );
  }

  // Step 6: Pagination (limit: 2, page: 1/2)
  const respPage1 =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(respPage1);
  TestValidator.equals("page1: limit")(respPage1.pagination.limit)(2);
  TestValidator.equals("page1: current")(respPage1.pagination.current)(1);
  TestValidator.predicate("page1: length ≤ limit")(respPage1.data.length <= 2);

  // Next page
  const respPage2 =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(respPage2);
  TestValidator.equals("page2: current")(respPage2.pagination.current)(2);
  TestValidator.predicate("page2: length ≤ limit")(respPage2.data.length <= 2);
  TestValidator.equals("pagination.pages consistent")(
    respPage1.pagination.pages,
  )(respPage2.pagination.pages);
  TestValidator.equals("pagination.records consistent")(
    respPage1.pagination.records,
  )(respPage2.pagination.records);

  // Step 7: Out-of-bounds page (empty)
  const respEmpty =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          limit: 2,
          page: 99999,
        },
      },
    );
  typia.assert(respEmpty);
  TestValidator.equals("empty data")(respEmpty.data.length)(0);
  TestValidator.equals("empty: pages meta")(respEmpty.pagination.pages)(
    respPage1.pagination.pages,
  );
  TestValidator.equals("empty: records meta")(respEmpty.pagination.records)(
    respPage1.pagination.records,
  );
}
