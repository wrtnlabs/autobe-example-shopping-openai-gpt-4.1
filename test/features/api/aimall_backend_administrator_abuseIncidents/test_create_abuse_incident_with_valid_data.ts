import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate creation of a new abuse incident by an administrator with valid
 * data.
 *
 * This test ensures an abuse incident can be created successfully via the
 * administrator API endpoint, with valid incident type and all required context
 * fields. It checks that all audit/context fields are populated, verifies input
 * fields such as type and detected_at, and confirms the new incident is
 * initially unresolved.
 *
 * Steps:
 *
 * 1. Prepare valid input for a new incident (type, detected_at, context fields)
 * 2. Call the creation endpoint as administrator
 * 3. Assert core fields in the output match the input, and resolved is false
 * 4. Verify the record id is a valid UUID
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_create(
  connection: api.IConnection,
) {
  // 1. Prepare valid input for a new incident
  const now = new Date().toISOString();
  const input: IAimallBackendAbuseIncident.ICreate = {
    type: "coupon_stacking",
    detected_at: now,
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: null,
    coupon_id: null,
    discount_campaign_id: null,
    details: "Detected during compliance audit (test case)",
  };

  // 2. Create the abuse incident via API
  const created =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: input },
    );
  typia.assert(created);

  // 3. Assert core fields in output match input
  TestValidator.equals("type matches")(created.type)(input.type);
  TestValidator.equals("detected_at matches")(created.detected_at)(
    input.detected_at,
  );
  TestValidator.equals("resolved is false")(created.resolved)(false);
  TestValidator.equals("customer_id matches")(created.customer_id)(
    input.customer_id,
  );
  TestValidator.equals("order_id matches")(created.order_id)(input.order_id);
  TestValidator.equals("coupon_id matches")(created.coupon_id)(input.coupon_id);
  TestValidator.equals("discount_campaign_id matches")(
    created.discount_campaign_id,
  )(input.discount_campaign_id);
  TestValidator.equals("details matches")(created.details)(input.details);

  // 4. Verify id format (UUID)
  TestValidator.predicate("id is uuid")(
    typeof created.id === "string" &&
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
        created.id,
      ),
  );
}
