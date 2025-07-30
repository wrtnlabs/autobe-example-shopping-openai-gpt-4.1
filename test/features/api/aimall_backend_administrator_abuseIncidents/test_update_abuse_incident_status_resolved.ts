import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validates that only allowed fields (type, details, resolved) can be updated
 * on an abuse incident record by admin, and that changes to forbidden fields
 * are rejected.
 *
 * 1. Creates a new abuse incident record as unresolved (using POST).
 * 2. Updates the 'resolved' status to true via the PUT endpoint.
 * 3. Confirms only allowed fields change (resolved); forbidden fields such as
 *    'detected_at' do not change.
 * 4. Attempts to change a forbidden field ('detected_at') in update -- expects an
 *    error to be thrown.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_update_abuse_incident_status_resolved(
  connection: api.IConnection,
) {
  // 1. Create a new unresolved abuse incident
  const createInput: IAimallBackendAbuseIncident.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: null,
    coupon_id: null,
    discount_campaign_id: null,
    type: "velocity_anomaly",
    details:
      "Automated E2E test: original incident. Should only be resolved by admin.",
    detected_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const created =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 2. Update to resolved
  const updated =
    await api.functional.aimall_backend.administrator.abuseIncidents.update(
      connection,
      {
        abuseIncidentId: created.id,
        body: { resolved: true },
      },
    );
  typia.assert(updated);
  TestValidator.equals("resolved should now be true")(updated.resolved)(true);
  TestValidator.equals("type should stay the same")(updated.type)(created.type);
  TestValidator.equals("detected_at unchanged")(updated.detected_at)(
    created.detected_at,
  );
  TestValidator.equals("details unchanged")(updated.details)(created.details);
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    created.customer_id,
  );
  TestValidator.equals("order_id unchanged")(updated.order_id)(
    created.order_id,
  );
  TestValidator.equals("coupon_id unchanged")(updated.coupon_id)(
    created.coupon_id,
  );
  TestValidator.equals("discount_campaign_id unchanged")(
    updated.discount_campaign_id,
  )(created.discount_campaign_id);
  TestValidator.equals("id unchanged")(updated.id)(created.id);

  // 3. Try illegal/mutating forbidden fields: detected_at
  await TestValidator.error("cannot update forbidden detected_at field")(() =>
    api.functional.aimall_backend.administrator.abuseIncidents.update(
      connection,
      {
        abuseIncidentId: created.id,
        // TypeScript will not allow detected_at in IUpdate, but purposely cast as any to simulate client-side error case
        body: {
          detected_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } as any,
      },
    ),
  );
}
