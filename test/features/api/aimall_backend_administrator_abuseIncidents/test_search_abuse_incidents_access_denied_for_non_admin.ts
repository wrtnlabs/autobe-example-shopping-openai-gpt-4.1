import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";
import type { IPageIAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAbuseIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that non-administrator users are denied access to advanced abuse
 * incident search.
 *
 * This test simulates attempts by both a customer and a seller (non-admin
 * roles) to search the abuse incident logs via the administrator-only PATCH
 * endpoint. These operations should result in an access denial (e.g., HTTP
 * 403/401), as per privacy and compliance rules restricting incident log search
 * to administrator roles only.
 *
 * Steps performed:
 *
 * 1. Simulate a customer user attempting PATCH search on
 *    /aimall-backend/administrator/abuseIncidents, expecting an access denied
 *    error (401/403).
 * 2. Simulate a seller user attempting PATCH search on the same endpoint,
 *    expecting an access denied error (401/403).
 * 3. Assert that both receive an error, confirming role-based access controls are
 *    enforced.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_search_abuse_incidents_access_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Simulate PATCH search as customer - should be denied.
  await TestValidator.error("customer should be denied incident search")(
    async () => {
      // (Assume the connection has already been set up as a customer)
      await api.functional.aimall_backend.administrator.abuseIncidents.search(
        connection,
        {
          body: typia.random<IAimallBackendAbuseIncident.IRequest>(),
        },
      );
    },
  );

  // 2. Simulate PATCH search as seller - should be denied.
  await TestValidator.error("seller should be denied incident search")(
    async () => {
      // (Assume the connection has already been set up as a seller)
      await api.functional.aimall_backend.administrator.abuseIncidents.search(
        connection,
        {
          body: typia.random<IAimallBackendAbuseIncident.IRequest>(),
        },
      );
    },
  );
}
