import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validates that an attempt to update a discount campaign with missing required
 * fields (such as name or type) fails with a validation error.
 *
 * Business Context: Administrators must not be able to submit partial/invalid
 * campaign updates that omit essential fields. Campaigns must always have a
 * valid name and type according to platform requirements, and the API must
 * enforce these validation rules on update.
 *
 * Steps:
 *
 * 1. Create a campaign via the create endpoint to obtain a target for update.
 * 2. Try to update the campaign with incomplete or invalid data (e.g., both name
 *    and type set to null, or omitted), which should violate validation.
 * 3. Verify that the API rejects the update with a validation error (i.e., an
 *    error is thrown and no update occurs).
 *
 * Coverage: This test checks both empty-body update and update with required
 * fields explicitly null. It expects runtime validation failures, not
 * TypeScript compile-time errors.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_update_discount_campaign_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Create a campaign to serve as update target
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: "Validation Test Campaign",
          code: `VAL-${typia.random<string>().slice(0, 8)}`,
          type: "order",
          status: "active",
          stackable: true,
          start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          max_uses_per_user: 1,
          priority: 10,
          description: "Created for validation error testing.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);
  // 2a. Attempt update with empty body (no fields)
  await TestValidator.error("empty update body should fail validation")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.update(
        connection,
        {
          discountCampaignId: campaign.id,
          body: {} satisfies IAimallBackendDiscountCampaign.IUpdate,
        },
      );
    },
  );
  // 2b. Attempt update with all required fields set to null
  await TestValidator.error("all required fields null should fail validation")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.update(
        connection,
        {
          discountCampaignId: campaign.id,
          body: {
            name: null,
            type: null,
          } satisfies IAimallBackendDiscountCampaign.IUpdate,
        },
      );
    },
  );
  // 2c. Attempt update with only one required field supplied (e.g. omit 'type')
  await TestValidator.error(
    "missing one required field should fail validation",
  )(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.update(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          name: "Updated Name",
        } satisfies IAimallBackendDiscountCampaign.IUpdate,
      },
    );
  });
}
