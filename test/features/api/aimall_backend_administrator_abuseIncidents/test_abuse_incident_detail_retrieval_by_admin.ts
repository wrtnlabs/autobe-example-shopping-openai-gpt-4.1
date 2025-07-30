import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Test detail retrieval of a specific abuse incident by admin.
 *
 * Validates that admin can create and retrieve a detailed abuse incident
 * record, asserting all business fields (type, resolved status, detection
 * metadata, contextual foreign keys) are present. Ensures field-level integrity
 * for audit, compliance, and risk investigation workflows.
 *
 * Steps:
 *
 * 1. Create a new abuse incident as admin (with filled contextual and metadata
 *    fields).
 * 2. Retrieve the created incident by its ID via admin GET endpoint.
 * 3. Assert all returned fields match created values, ensuring all context is
 *    preserved for audit/compliance requirements.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_at(
  connection: api.IConnection,
) {
  // 1. Create a new abuse incident as an administrator
  const createInput = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    coupon_id: typia.random<string & tags.Format<"uuid">>(),
    discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
    type: "velocity_anomaly", // plausible business/incident type value
    details: "Detected via automated risk system.",
    detected_at: new Date().toISOString(),
  } satisfies IAimallBackendAbuseIncident.ICreate;
  const created =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 2. Retrieve the detailed incident record as admin
  const detail =
    await api.functional.aimall_backend.administrator.abuseIncidents.at(
      connection,
      { abuseIncidentId: created.id },
    );
  typia.assert(detail);

  // 3. Field integrity checks for audit/compliance
  TestValidator.equals("type matches")(detail.type)(createInput.type);
  TestValidator.equals("customer_id matches")(detail.customer_id)(
    createInput.customer_id,
  );
  TestValidator.equals("order_id matches")(detail.order_id)(
    createInput.order_id,
  );
  TestValidator.equals("coupon_id matches")(detail.coupon_id)(
    createInput.coupon_id,
  );
  TestValidator.equals("discount_campaign_id matches")(
    detail.discount_campaign_id,
  )(createInput.discount_campaign_id);
  TestValidator.equals("detected_at matches")(detail.detected_at)(
    createInput.detected_at,
  );
  TestValidator.equals("details matches")(detail.details)(createInput.details);
  TestValidator.equals("resolved is false by default")(detail.resolved)(false);
  TestValidator.equals("id matches created")(detail.id)(created.id);
}
