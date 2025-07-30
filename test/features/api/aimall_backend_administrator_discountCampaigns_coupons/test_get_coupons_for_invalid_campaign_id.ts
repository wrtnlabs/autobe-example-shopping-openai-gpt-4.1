import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate error handling when requesting coupons for a non-existent discount
 * campaign ID.
 *
 * This test ensures the API responds safely and correctly when given an invalid
 * or non-existent discountCampaignId:
 *
 * 1. Generate a random discountCampaignId (UUID) unlikely to exist in the system.
 * 2. Call
 *    `api.functional.aimall_backend.administrator.discountCampaigns.coupons.index`
 *    with this ID.
 * 3. Expect the operation to throw an error (not-found or validation error).
 * 4. Confirm that no coupon data or sensitive information is leaked in the error
 *    response.
 *
 * Steps:
 *
 * 1. Generate a random UUID for discountCampaignId.
 * 2. Attempt the coupons fetch API call.
 * 3. Assert that an error is thrown.
 * 4. Check that the error (if accessible) does not contain coupon or customer
 *    IDs/data.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_get_coupons_for_invalid_campaign_id(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent campaign ID.
  const invalidDiscountCampaignId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to retrieve coupons for this invalid campaign, expecting an error.
  await TestValidator.error(
    "Should fail with not-found or validation error, and not leak coupon data",
  )(async () => {
    try {
      await api.functional.aimall_backend.administrator.discountCampaigns.coupons.index(
        connection,
        {
          discountCampaignId: invalidDiscountCampaignId,
        },
      );
    } catch (err) {
      // Optional: if error object structure is accessible, check that no coupon data is present.
      if (err && typeof err === "object" && "data" in err) {
        // Should NOT include coupons or customer IDs.
        TestValidator.predicate("Error data should not include coupon array")(
          !Array.isArray((err as any).data),
        );
      }
      throw err; // Always rethrow to satisfy TestValidator.error
    }
  });
}
