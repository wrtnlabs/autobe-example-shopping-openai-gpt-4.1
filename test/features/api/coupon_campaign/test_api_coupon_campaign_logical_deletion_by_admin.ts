import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";

/**
 * Test the logical (soft) deletion of a coupon campaign by an authenticated
 * admin.
 *
 * 1. Register a new admin via /auth/admin/join
 * 2. Use the admin session to create a coupon campaign via
 *    /shoppingMall/admin/couponCampaigns (with valid random data)
 * 3. Soft-delete the created campaign by calling
 *    /shoppingMall/admin/couponCampaigns/:campaignId with DELETE
 * 4. Try deleting the same campaign again and assert error is thrown (already
 *    deleted)
 * 5. Try deleting a non-existent campaign and assert error is thrown
 *
 * Notes:
 *
 * - Since there is no campaign-at/listing API, verification of deleted state is
 *   via subsequent delete attempts (which should fail with clear error)
 * - Only use available DTOs and API functions (no list/read/audit APIs present)
 */
export async function test_api_coupon_campaign_logical_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminSession: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminSession);

  // 2. Create a coupon campaign
  const campaignCreateInput = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph(),
    starts_at: new Date(Date.now() + 60_000).toISOString(), // starts 1 min from now
    ends_at: new Date(Date.now() + 60_000 * 60 * 24).toISOString(), // ends 24h+ later
    business_status: "active", // business_status (string) - random in real, here for deterministic
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign: IShoppingMallCouponCampaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignCreateInput,
    });
  typia.assert(campaign);
  TestValidator.equals(
    "coupon campaign name matches input",
    campaign.name,
    campaignCreateInput.name,
  );
  TestValidator.equals(
    "coupon campaign not deleted immediately after create",
    campaign.deleted_at,
    null,
  );

  // 3. Soft-delete the campaign
  await api.functional.shoppingMall.admin.couponCampaigns.erase(connection, {
    campaignId: campaign.id,
  });

  // 4. Attempt to delete already-deleted campaign (should error)
  await TestValidator.error(
    "deleting already soft-deleted campaign should fail",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.erase(
        connection,
        { campaignId: campaign.id },
      );
    },
  );

  // 5. Attempt to delete a non-existent campaign
  await TestValidator.error(
    "deleting non-existent campaign should fail",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.erase(
        connection,
        { campaignId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
