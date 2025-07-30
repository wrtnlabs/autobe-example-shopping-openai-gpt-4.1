import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Test duplicate context detection when creating abuse incidents.
 *
 * This test creates two abuse incident records with identical 'type' and
 * 'details' fields in quick succession, simulating repeated or duplicate event
 * triggers (e.g., AI detector or admin saves the same event twice). It then
 * checks if the system has deduplication logic (i.e., only one record stored)
 * or if both are allowed, confirming the actual business behavior for such
 * cases.
 *
 * 1. Construct a specific abuse incident creation input with type and details set
 *    to known values (could be something like type 'coupon_stacking' and a
 *    sample context).
 * 2. Call the abuse incident creation API with this input (store the returned
 *    incident).
 * 3. Immediately call the creation API again with an identical input (store the
 *    returned incident).
 * 4. Assert that both returned incidents are valid and type-correct.
 * 5. If both incidents have different UUIDs, assert that the system allows
 *    duplicates (expected for most logging scenarios).
 * 6. Optionally: Add a note that if the API throws or returns the same ID (or
 *    error), this would indicate deduplication or uniqueness enforcement, and
 *    the test should validate this behavior instead accordingly.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_create_abuse_incident_duplicate_context_detection(
  connection: api.IConnection,
) {
  // 1. Build a common incident input
  const input: IAimallBackendAbuseIncident.ICreate = {
    type: "coupon_stacking",
    details:
      "Suspicious self-referral using stacked coupons detected for customer.",
    detected_at: new Date().toISOString(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: null,
    coupon_id: null,
    discount_campaign_id: null,
  };

  // 2. Create first incident
  const incidentA =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: input },
    );
  typia.assert(incidentA);

  // 3. Create duplicate incident
  const incidentB =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: input },
    );
  typia.assert(incidentB);

  // 4. Validate results
  TestValidator.notEquals("duplicate incident IDs")(incidentA.id)(incidentB.id);
  TestValidator.equals("incidentA type correct")(incidentA.type)(input.type);
  TestValidator.equals("incidentB type correct")(incidentB.type)(input.type);
  TestValidator.equals("incidentA details correct")(incidentA.details)(
    input.details,
  );
  TestValidator.equals("incidentB details correct")(incidentB.details)(
    input.details,
  );

  // 5. (Optional) If system implements deduplication, replace above assertion with suitable error check
}
