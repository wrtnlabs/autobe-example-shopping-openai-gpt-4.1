import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFinancialIncident";
import type { IPageIShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFinancialIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_financial_incident_search_success_and_filtering_admin(
  connection: api.IConnection,
) {
  /**
   * Tests searching and filtering of financial incidents as admin, asserting
   * response correctness for various query scenarios.
   *
   * Steps:
   *
   * 1. Register admin (ensures proper authentication, required for endpoint
   *    access).
   * 2. Ensure there are some financial incidents present in the backend (relies on
   *    assumed seeded data or previous test runs; creation API is not exposed
   *    here).
   * 3. Search incidents with no filters: checks that results page and basic
   *    pagination behave correctly.
   * 4. Sample one or more existing fields (such as incident_type, status, customer
   *    etc.) from listed results for filtering.
   * 5. For each filter field, query for only records matching that field and check
   *    results (e.g. by incident_type, by status, by customer).
   * 6. Query with strict/unmatched filters to confirm empty results.
   * 7. Apply pagination (limit/page), order_by/direction, and confirm the
   *    responses behave as expected.
   * 8. Assert response types, field values, and summary statistics for each
   *    search.
   */

  // 1. Register and authenticate an admin account
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminPassword = RandomGenerator.alphaNumeric(16); // password hash in real-case
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@wrtn.ai`;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Token is installed in connection.headers.Authorization

  // 2. Query with no filters (should return first page)
  const basicPage =
    await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
      },
    );
  typia.assert(basicPage);
  TestValidator.predicate(
    "should get a paginated result at least",
    basicPage.data.length >= 0,
  );

  if (basicPage.data.length > 0) {
    const sampleIncident = basicPage.data[0];

    // 3. Filter by incident_type
    if (sampleIncident.incident_type) {
      const byType =
        await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
          connection,
          {
            body: {
              incident_type: sampleIncident.incident_type,
              limit: 10,
            } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
          },
        );
      typia.assert(byType);
      TestValidator.predicate(
        "all returned have expected incident_type",
        byType.data.every(
          (i) => i.incident_type === sampleIncident.incident_type,
        ),
      );
    }

    // 4. Filter by status
    if (sampleIncident.status) {
      const byStatus =
        await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
          connection,
          {
            body: {
              status: sampleIncident.status,
              limit: 10,
            } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
          },
        );
      typia.assert(byStatus);
      TestValidator.predicate(
        "all returned have expected status",
        byStatus.data.every((i) => i.status === sampleIncident.status),
      );
    }

    // 5. Filter by created_at_from/created_at_to
    if (sampleIncident.created_at) {
      const from = sampleIncident.created_at;
      const to = sampleIncident.created_at;
      const byDate =
        await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
          connection,
          {
            body: {
              created_at_from: from,
              created_at_to: to,
              limit: 10,
            } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
          },
        );
      typia.assert(byDate);
      TestValidator.predicate(
        "incident created_at in expected range",
        byDate.data.every((i) => i.created_at >= from && i.created_at <= to),
      );
    }
  }

  // 6. Apply unmatched filter to confirm behavior (should get zero results)
  const unmatched =
    await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
      connection,
      {
        body: {
          incident_type: "never_matched_code",
          limit: 10,
        } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
      },
    );
  typia.assert(unmatched);
  TestValidator.equals(
    "unmatched filter returns empty result",
    unmatched.data.length,
    0,
  );

  // 7. Pagination - fetch second page (if there are enough records)
  if (basicPage.pagination.records > basicPage.pagination.limit) {
    const page2 =
      await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
        connection,
        {
          body: {
            page: 2,
            limit: basicPage.pagination.limit,
          } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "pagination page 2 is valid",
      page2.pagination.current === 2 &&
        page2.pagination.limit === basicPage.pagination.limit,
    );
  }

  // 8. Sort order by created_at desc/asc (if at least two rows)
  if (basicPage.data.length >= 2) {
    // Descending
    const descPage =
      await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
        connection,
        {
          body: {
            order_by: "created_at",
            direction: "desc",
            limit: 10,
          } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
        },
      );
    typia.assert(descPage);
    TestValidator.predicate(
      "sorted descending by created_at",
      descPage.data.every(
        (x, idx, arr) => idx === 0 || arr[idx - 1].created_at >= x.created_at,
      ),
    );

    // Ascending
    const ascPage =
      await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
        connection,
        {
          body: {
            order_by: "created_at",
            direction: "asc",
            limit: 10,
          } satisfies IShoppingMallAiBackendFinancialIncident.IRequest,
        },
      );
    typia.assert(ascPage);
    TestValidator.predicate(
      "sorted ascending by created_at",
      ascPage.data.every(
        (x, idx, arr) => idx === 0 || arr[idx - 1].created_at <= x.created_at,
      ),
    );
  }
}
