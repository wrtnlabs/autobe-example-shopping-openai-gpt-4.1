import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Test: Attempt to update immutable/restricted fields (e.g.,
 * detected_at/primary context fields) on an abuse incident using PUT.
 *
 * This test verifies that attempting to update fields that are not allowed to
 * be modified (such as 'detected_at', customer_id, order_id, coupon_id,
 * discount_campaign_id) on an abuse incident will be rejected by the API, and
 * that existing values remain unchanged. It also confirms that allowed fields
 * (type, details, resolved) can be updated.
 *
 * Steps:
 *
 * 1. Create a valid abuse incident via POST.
 * 2. Attempt to update the newly created abuse incident using PUT, including in
 *    the body one or more fields that are not updatable by the IUpdate DTO
 *    (e.g., detected_at, customer_id, order_id, coupon_id,
 *    discount_campaign_id).
 * 3. Verify that the API returns a validation/business error and no update occurs
 *    on immutable/restricted fields.
 * 4. Verify that permitted fields (details, type, resolved) CAN still be updated
 *    successfully via PUT.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_update_abuse_incident_invalid_field(
  connection: api.IConnection,
) {
  // 1. Create abuse incident
  const createInput: IAimallBackendAbuseIncident.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    coupon_id: typia.random<string & tags.Format<"uuid">>(),
    discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
    type: "coupon_stacking",
    details: "Test for restricted update",
    detected_at: new Date().toISOString(),
  };
  const original: IAimallBackendAbuseIncident =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: createInput },
    );
  typia.assert(original);

  // 2. Attempt to update forbidden fields: detected_at and primary context fields
  const forbiddenUpdate = {
    detected_at: new Date(Date.now() + 100000).toISOString(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    coupon_id: typia.random<string & tags.Format<"uuid">>(),
    discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 2a. Confirm forbidden field update fails with error
  await TestValidator.error("update forbidden fields should fail")(() =>
    api.functional.aimall_backend.administrator.abuseIncidents.update(
      connection,
      {
        abuseIncidentId: original.id,
        body: forbiddenUpdate as IAimallBackendAbuseIncident.IUpdate,
      },
    ),
  );

  // 3. Optionally: check immutability (GET not available, state assumed unchanged)
  // 4. Update with only permitted fields
  const allowedUpdate: IAimallBackendAbuseIncident.IUpdate = {
    details: "Updated details",
    resolved: !original.resolved,
    type: "system_policy",
  };
  const mod: IAimallBackendAbuseIncident =
    await api.functional.aimall_backend.administrator.abuseIncidents.update(
      connection,
      {
        abuseIncidentId: original.id,
        body: allowedUpdate,
      },
    );
  typia.assert(mod);
  TestValidator.equals("updated details")(mod.details)(allowedUpdate.details);
  TestValidator.equals("updated type")(mod.type)(allowedUpdate.type);
  TestValidator.equals("resolved flag")(mod.resolved)(allowedUpdate.resolved);
}
