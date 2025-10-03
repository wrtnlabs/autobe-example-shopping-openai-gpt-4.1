import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";

/**
 * Validate admin creation of coupon campaigns with business rule and permission
 * enforcement.
 *
 * 1. Register (join) a new admin and authenticate
 * 2. As admin, create a coupon campaign with valid, unique name and all optional
 *    fields
 * 3. Confirm proper schema and payload in the response (all fields present,
 *    audit/compliance)
 * 4. Attempt duplicate name campaign creation (should fail with business rule
 *    error)
 * 5. Attempt invalid date schedule (ends_at before starts_at) (should fail with
 *    validation error)
 * 6. Attempt campaign creation as a non-admin (should fail with permission error)
 * 7. For all error cases, confirm error is thrown
 */
export async function test_api_coupon_campaign_admin_create(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  // 2. Create valid coupon campaign
  const campaignName = RandomGenerator.paragraph({ sentences: 2 });
  const startsAt = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // 10 min from now
  const endsAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h from now
  const campaignBody = {
    name: campaignName,
    description: RandomGenerator.content({ paragraphs: 2 }),
    starts_at: startsAt satisfies string as string,
    ends_at: endsAt satisfies string as string,
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign: IShoppingMallCouponCampaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignBody,
    });
  typia.assert(campaign);
  // Validate response fields
  TestValidator.equals(
    "campaign name matches",
    campaign.name,
    campaignBody.name,
  );
  TestValidator.equals(
    "business_status matches",
    campaign.business_status,
    campaignBody.business_status,
  );
  TestValidator.predicate(
    "has created_at",
    typeof campaign.created_at === "string" && !!campaign.created_at,
  );
  TestValidator.predicate(
    "has updated_at",
    typeof campaign.updated_at === "string" && !!campaign.updated_at,
  );
  // 3. Attempt duplicate name
  await TestValidator.error(
    "duplicate coupon campaign name should throw",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.create(
        connection,
        { body: campaignBody },
      );
    },
  );
  // 4. Invalid schedule: ends_at before starts_at
  const invalidScheduleBody = {
    ...campaignBody,
    starts_at: endsAt,
    ends_at: startsAt,
    name: RandomGenerator.paragraph({ sentences: 2 }) + "-invalid-date",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  await TestValidator.error(
    "ends_at before starts_at should throw",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.create(
        connection,
        { body: invalidScheduleBody },
      );
    },
  );
  // 5. Permission: Unauthenticated/non-admin tries to create
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot create campaign", async () => {
    await api.functional.shoppingMall.admin.couponCampaigns.create(unauthConn, {
      body: campaignBody,
    });
  });
}
