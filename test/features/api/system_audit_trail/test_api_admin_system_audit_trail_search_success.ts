import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";
import type { IPageIShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemAuditTrail";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_system_audit_trail_search_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful system audit trail search, filtering, and pagination as
   * admin.
   *
   * 1. Register and authenticate an admin using /auth/admin/join.
   * 2. Execute PATCH /shoppingMallAiBackend/admin/systemAuditTrails with various:
   *
   *    - Event_type filter
   *    - Actor_id filter
   *    - Description (full-text) filter
   *    - Created_at_from and created_at_to (date range)
   *    - Pagination (page/limit)
   * 3. For each response, check: a. All returned entries match filter(s) b.
   *    Pagination metadata is consistent c. All fields are present (admin
   *    visibility) d. Empty result for non-matching search
   * 4. Boundaries: test first/last page, empty query, and multi-filtered query.
   */

  // Step 1: Register and authenticate admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hashed password
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(7)}@autobe-test.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;

  // Step 2a: General, unfiltered query (smoke test, get sample values)
  const page1 =
    await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
      connection,
      {
        body: {}, // No filters - get all (or default paged)
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "audit trail list has array data",
    Array.isArray(page1.data),
  );
  // Save sample values for further filter tests, if available
  const sampleEventType =
    page1.data.length > 0 ? page1.data[0].event_type : undefined;
  const sampleActorId =
    page1.data.length > 0 ? page1.data[0].actor_id : undefined;
  const sampleDescription =
    page1.data.length > 0 ? page1.data[0].description : undefined;
  const sampleCreatedAt =
    page1.data.length > 0 ? page1.data[0].created_at : undefined;

  // Step 2b: event_type filter (only if any values to use)
  if (sampleEventType) {
    const byType =
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        connection,
        {
          body: { event_type: sampleEventType },
        },
      );
    typia.assert(byType);
    TestValidator.predicate(
      "event_type filter applied",
      byType.data.every((e) => e.event_type === sampleEventType),
    );
  }

  // Step 2c: actor_id filter
  if (sampleActorId) {
    const byActor =
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        connection,
        {
          body: { actor_id: sampleActorId },
        },
      );
    typia.assert(byActor);
    TestValidator.predicate(
      "actor_id filter applied",
      byActor.data.every((e) => e.actor_id === sampleActorId),
    );
  }

  // Step 2d: description (full-text) filter
  if (sampleDescription) {
    // Use a substring of the description as a keyword
    const keyword = RandomGenerator.substring(sampleDescription);
    const byDesc =
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        connection,
        {
          body: { description: keyword },
        },
      );
    typia.assert(byDesc);
    TestValidator.predicate(
      "description filter includes keyword",
      byDesc.data.every((e) => e.description.includes(keyword)),
    );
  }

  // Step 2e: Date range filter
  if (sampleCreatedAt) {
    // Use sampleCreatedAt as the lower or upper bound
    const byFrom =
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        connection,
        {
          body: { created_at_from: sampleCreatedAt },
        },
      );
    typia.assert(byFrom);
    TestValidator.predicate(
      "created_at_from filter applied",
      byFrom.data.every(
        (e) => new Date(e.created_at) >= new Date(sampleCreatedAt),
      ),
    );

    const byTo =
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        connection,
        {
          body: { created_at_to: sampleCreatedAt },
        },
      );
    typia.assert(byTo);
    TestValidator.predicate(
      "created_at_to filter applied",
      byTo.data.every(
        (e) => new Date(e.created_at) <= new Date(sampleCreatedAt),
      ),
    );
  }

  // Step 2f: Pagination boundary (test page=1, limit=2)
  const pagedResults =
    await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
      connection,
      {
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(pagedResults);
  TestValidator.predicate(
    "paged results data array size <= limit",
    pagedResults.data.length <= 2,
  );
  TestValidator.equals(
    "pagination meta current page",
    pagedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination meta limit",
    pagedResults.pagination.limit,
    2,
  );

  // Step 2g: Multi-filter query, if possible
  if (sampleEventType && sampleActorId && sampleDescription) {
    const multi =
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        connection,
        {
          body: {
            event_type: sampleEventType,
            actor_id: sampleActorId,
            description: sampleDescription.substring(
              0,
              Math.min(10, sampleDescription.length),
            ),
          },
        },
      );
    typia.assert(multi);
    TestValidator.predicate(
      "multi-filter applied for all results",
      multi.data.every(
        (e) =>
          e.event_type === sampleEventType &&
          e.actor_id === sampleActorId &&
          e.description.includes(
            sampleDescription.substring(
              0,
              Math.min(10, sampleDescription.length),
            ),
          ),
      ),
    );
  }

  // Step 2h: Query with no expected results (nonexistent event_type)
  const emptyByType =
    await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
      connection,
      {
        body: {
          event_type:
            "this_type_does_not_exist_" + RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(emptyByType);
  TestValidator.equals(
    "empty result for non-matching event_type",
    emptyByType.data.length,
    0,
  );
}
