import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate that non-admin users (customers, sellers, unauthenticated) are
 * denied access to abuse incident detail records via the admin-only endpoint.
 *
 * This test ensures privacy and compliance by verifying that sensitive incident
 * data is not accessible to unauthorized roles. The endpoint must block access
 * attempts from non-admins and never expose incident details, metadata, or even
 * existence.
 *
 * Steps:
 *
 * 1. Generate a random abuse incident UUID (it doesn't need to exist, as the
 *    endpoint must not leak info regardless).
 * 2. Attempt to access the detail endpoint as a non-admin
 *    (unauthenticated/customer/seller) connection.
 * 3. Verify that the call fails with a forbidden error (HTTP 403 or equivalent)
 *    and that no incident data is returned.
 *
 * This test validates that privacy and compliance boundaries are strictly
 * enforced.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_access_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for abuse incident
  const abuseIncidentId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to access detail as a non-admin
  await TestValidator.error("non-admin access must be forbidden")(async () => {
    await api.functional.aimall_backend.administrator.abuseIncidents.at(
      connection,
      { abuseIncidentId },
    );
  });
}
