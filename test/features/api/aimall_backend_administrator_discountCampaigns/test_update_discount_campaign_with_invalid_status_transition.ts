import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate error handling for invalid discount campaign status transitions in
 * administrator update.
 *
 * This test ensures the system enforces discount campaign lifecycle business
 * rules—specifically, that an administrator cannot reactivate an ended
 * campaign, nor set an end date in the past.
 *
 * Steps:
 *
 * 1. Create a discount campaign with an end date in the past (so its status is or
 *    can be set to 'ended').
 * 2. Attempt to update the campaign status back to 'active' (which is not
 *    permitted by business rules).
 * 3. Attempt to shorten the campaign's end date so that it is before the current
 *    time (which violates date rules).
 * 4. Expect the API to return a business rule violation error for each forbidden
 *    update.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_update_discount_campaign_with_invalid_status_transition(
  connection: api.IConnection,
) {
  // 1. Create a campaign with a past end date (campaign should be over)
  const now = new Date();
  const campaignInput = {
    name: `Ended campaign ${now.getTime()}`,
    code: `EXPIRED${now.getTime()}`,
    type: "order",
    status: "ended",
    stackable: false,
    start_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // ended 1 day ago
    max_uses_per_user: 1,
    priority: 1,
    description: "Auto-created for status transition validation test.",
  } satisfies IAimallBackendDiscountCampaign.ICreate;
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: campaignInput,
      },
    );
  typia.assert(campaign);

  // 2. Attempt to re-activate the already-ended campaign (should fail)
  await TestValidator.error("Cannot reactivate an ended campaign")(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.update(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          status: "active",
        } satisfies IAimallBackendDiscountCampaign.IUpdate,
      },
    );
  });

  // 3. Attempt to set an end date before now (should fail)
  await TestValidator.error("Cannot set end_at in the past")(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.update(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          end_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        } satisfies IAimallBackendDiscountCampaign.IUpdate,
      },
    );
  });
}
