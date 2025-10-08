import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerServiceEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";

/**
 * Test admin search and advanced filtering of customer service events,
 * verifying that only properly authenticated admins can paginate, filter, and
 * access event detail while unauthorized access is blocked. Validate search by
 * event type, date range, and actor, ensuring returned events match filters and
 * pagination metadata.
 */
export async function test_api_customer_service_event_admin_search_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        full_name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Basic paged search: retrieve events (no filter)
  const baseSearch: IPageIShoppingMallCustomerServiceEvent =
    await api.functional.shoppingMall.admin.customerServiceEvents.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(baseSearch);
  TestValidator.predicate(
    "pagination info must include current, limit, records, pages",
    typeof baseSearch.pagination.current === "number" &&
      typeof baseSearch.pagination.limit === "number" &&
      typeof baseSearch.pagination.records === "number" &&
      typeof baseSearch.pagination.pages === "number",
  );
  TestValidator.predicate(
    "response data must be an array",
    Array.isArray(baseSearch.data),
  );
  if (baseSearch.data.length > 0) {
    const event = baseSearch.data[0];
    typia.assert(event);
  }

  // 3. Advanced filter: event_type and actor_admin_id
  const filterType = baseSearch.data.find(
    (ev) => ev.actor_admin_id !== null && ev.event_type !== undefined,
  );
  if (filterType && filterType.actor_admin_id && filterType.event_type) {
    const filtered: IPageIShoppingMallCustomerServiceEvent =
      await api.functional.shoppingMall.admin.customerServiceEvents.index(
        connection,
        {
          body: {
            event_type: filterType.event_type,
            actor_admin_id: filterType.actor_admin_id,
          },
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "all results must match event_type and actor_admin_id",
      filtered.data.every(
        (ev) =>
          ev.event_type === filterType.event_type &&
          ev.actor_admin_id === filterType.actor_admin_id,
      ),
    );
  }

  // 4. Date-range filter (if there is any data)
  if (baseSearch.data.length > 0) {
    const earliest = baseSearch.data
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    const latest = baseSearch.data
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const dateFiltered: IPageIShoppingMallCustomerServiceEvent =
      await api.functional.shoppingMall.admin.customerServiceEvents.index(
        connection,
        {
          body: {
            created_at_from: earliest.created_at,
            created_at_to: latest.created_at,
          },
        },
      );
    typia.assert(dateFiltered);
    TestValidator.predicate(
      "all results must be within date range",
      dateFiltered.data.every(
        (ev) =>
          ev.created_at >= earliest.created_at &&
          ev.created_at <= latest.created_at,
      ),
    );
  }

  // 5. Negative case: unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot use customerServiceEvents.index",
    async () => {
      await api.functional.shoppingMall.admin.customerServiceEvents.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
