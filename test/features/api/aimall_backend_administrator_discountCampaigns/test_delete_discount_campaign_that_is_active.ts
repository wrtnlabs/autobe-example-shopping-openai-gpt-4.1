import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Test hard deletion of an active discount campaign.
 *
 * This test validates the full removal of a discount campaign that is currently
 * in the 'active' state. It ensures the deletion operation is irreversible and
 * all references to the campaign are handled according to business rules. The
 * process begins by creating a new campaign (in 'active' status), then
 * performing the delete operation. It notes that verification of audit logs and
 * orphaned dependent records is not possible unless the appropriate API
 * endpoints are provided.
 *
 * Step-by-step process:
 *
 * 1. Create a new active discount campaign (status: 'active').
 * 2. DELETE the campaign using its ID via erase API.
 * 3. (Cannot verify with provided SDK) - Would attempt to fetch to confirm
 *    deletion, but such API not available.
 * 4. Note: Audit and dependent orphan validation omitted (not possible without
 *    supporting API).
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_delete_discount_campaign_that_is_active(
  connection: api.IConnection,
) {
  // 1. Create a new active discount campaign
  const now = new Date();
  const start = new Date(now.getTime() - 1000 * 60 * 60); // one hour ago
  const end = new Date(now.getTime() + 1000 * 60 * 60 * 24); // one day from now
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph()(2),
          code: `TEST-${Math.floor(Math.random() * 1000000)}`,
          type: "order",
          status: "active",
          stackable: true,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          max_uses_per_user: null,
          priority: 10,
          description: "Auto-generated campaign for delete scenario test.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Delete the campaign
  await api.functional.aimall_backend.administrator.discountCampaigns.erase(
    connection,
    {
      discountCampaignId: campaign.id,
    },
  );

  // 3. (Not possible with available APIs): Would attempt to fetch the campaign after deletion and expect an error,
  // but no GET-by-ID endpoint exists in the provided SDK, so this test is documented as a gap.
  //
  // 4. No audit log or dependent orphan validation possible without additional endpoints; skipped by design.
}
