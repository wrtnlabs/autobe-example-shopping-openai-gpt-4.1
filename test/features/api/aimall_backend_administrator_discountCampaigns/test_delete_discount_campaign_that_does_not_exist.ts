import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate deletion of a non-existent discount campaign.
 *
 * Business context: Only administrative users can hard-delete discount
 * campaigns via this endpoint. Attempting to delete a campaign that does not
 * exist in the system (i.e., passing a UUID that does not match any campaign)
 * should result in a not-found error response. No actual destructive action
 * should occur. There is no soft-delete: all deletes are hard deletes.
 *
 * Test steps:
 *
 * 1. Generate a UUID that is exceedingly unlikely to exist in the system.
 * 2. Attempt to delete a campaign with this non-existent UUID using the
 *    administrator-only endpoint.
 * 3. Verify that the system responds with a not-found error (typically HTTP 404)
 *    and does not succeed.
 * 4. Confirm no exception beyond the intended error is thrown and no campaign is
 *    deleted.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_erase_nonexistent(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID - exceedingly unlikely to exist as a campaign
  const nonExistentCampaignId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete using the administrator endpoint, expecting a not-found (error) response
  await TestValidator.error(
    "Should return not-found error when deleting non-existent campaign",
  )(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.erase(
      connection,
      {
        discountCampaignId: nonExistentCampaignId,
      },
    );
  });
}
