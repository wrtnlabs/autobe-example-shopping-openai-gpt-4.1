import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate that only administrators can create new seller records.
 *
 * This test verifies that attempting to create a new seller via the
 * /aimall-backend/administrator/sellers endpoint as a non-administrator (e.g.,
 * a customer, guest, or any unauthorized role) is properly restricted. The API
 * must reject such requests with a 403 Forbidden or equivalent error, ensuring
 * that non-admin users cannot onboard sellers.
 *
 * Steps:
 *
 * 1. Prepare a realistic but valid new seller onboarding payload using the
 *    official DTO.
 * 2. Attempt to call the seller creation API using a connection that does NOT have
 *    administrator privileges (simulated by the test connection context).
 * 3. Assert that an error is thrown, specifically verifying that privilege
 *    escalation is not permitted and seller onboarding is denied.
 * 4. No need to check for side-effects, as a denied request should not result in
 *    any seller being created.
 */
export async function test_api_aimall_backend_test_create_seller_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Prepare valid onboarding data for a new seller
  const sellerData = {
    business_name: RandomGenerator.paragraph()(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IAimallBackendSeller.ICreate;

  // 2. Attempt to create seller as non-admin, asserting rejection
  await TestValidator.error(
    "seller creation must be forbidden to non-admin users",
  )(async () => {
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerData },
    );
  });
}
