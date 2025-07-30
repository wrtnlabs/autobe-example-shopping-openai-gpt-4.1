import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate discount campaign update for duplicate code constraint.
 *
 * This test ensures that updating the `code` field of a discount campaign
 * entity to a value already assigned to another campaign is correctly rejected,
 * enforcing system-unique codes for all campaigns. This is crucial for campaign
 * identification, stacking logic, and analytic cross-referencing business
 * rules.
 *
 * Workflow:
 *
 * 1. Create the original campaign (target for the code update)
 * 2. Create a second campaign with a unique code (source of duplication)
 * 3. Attempt to update the first campaign's code to the second campaign's value
 * 4. Confirm validation correctly rejects the update with an error
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_update_discount_campaign_to_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create the original campaign to use as the update target
  const campaign1Input: IAimallBackendDiscountCampaign.ICreate = {
    name: `Test Campaign 1 - ${RandomGenerator.alphaNumeric(6)}`,
    code: `CODE-1-${RandomGenerator.alphaNumeric(10)}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date(Date.now() - 86400000).toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    max_uses_per_user: null,
    priority: 1,
    description: "Primary campaign for uniqueness update check.",
  };
  const campaign1 =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaign1Input },
    );
  typia.assert(campaign1);

  // 2. Create a second campaign with a unique, different code
  const campaign2Input: IAimallBackendDiscountCampaign.ICreate = {
    name: `Test Campaign 2 - ${RandomGenerator.alphaNumeric(6)}`,
    code: `DUPLICATE-CODE-${RandomGenerator.alphaNumeric(8)}`,
    type: "product",
    status: "active",
    stackable: true,
    start_at: new Date(Date.now() - 86400000).toISOString(),
    end_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    max_uses_per_user: 5,
    priority: 2,
    description: "Secondary campaign, source of duplicate code.",
  };
  const campaign2 =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaign2Input },
    );
  typia.assert(campaign2);

  // 3. Attempt to update campaign1's code to match campaign2's code (should fail)
  await TestValidator.error("updating code to duplicated code must fail")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.update(
        connection,
        {
          discountCampaignId: campaign1.id,
          body: {
            code: campaign2.code,
          } satisfies IAimallBackendDiscountCampaign.IUpdate,
        },
      );
    },
  );
}
