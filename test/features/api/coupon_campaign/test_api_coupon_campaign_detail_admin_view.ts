import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";

/**
 * Validate that admin can retrieve a coupon campaign's full detail, and
 * permission/enforcement logic work.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin.
 * 2. Create a coupon campaign with test data.
 * 3. Retrieve the campaign by id as admin; check all field matches.
 * 4. Attempt access as unauthenticated user, expect error.
 * 5. Soft-delete the campaign (if soft-delete API available), then validate detail
 *    view returns error or not found.
 * 6. (Skip step 5 if delete/soft-delete API not defined in provided API list.)
 */
export async function test_api_coupon_campaign_detail_admin_view(
  connection: api.IConnection,
) {
  // 1. Register admin & authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create coupon campaign
  const campaignBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;

  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignBody,
    });
  typia.assert(campaign);

  // 3. Retrieve as admin
  const detail = await api.functional.shoppingMall.admin.couponCampaigns.at(
    connection,
    {
      campaignId: campaign.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("campaign id matches", detail.id, campaign.id);
  TestValidator.equals("campaign name matches", detail.name, campaignBody.name);
  TestValidator.equals(
    "campaign description matches",
    detail.description,
    campaignBody.description,
  );
  TestValidator.equals(
    "campaign start date matches",
    detail.starts_at,
    campaignBody.starts_at,
  );
  TestValidator.equals(
    "campaign end date matches",
    detail.ends_at,
    campaignBody.ends_at,
  );
  TestValidator.equals(
    "campaign business status matches",
    detail.business_status,
    campaignBody.business_status,
  );
  TestValidator.equals("not soft-deleted", detail.deleted_at, null);

  // 4. Attempt access as unauthenticated user (create a new connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated cannot access campaign detail",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.at(unauthConn, {
        campaignId: campaign.id,
      });
    },
  );

  // 5. Soft-delete test - SKIP (no delete endpoint in provided API)
}
