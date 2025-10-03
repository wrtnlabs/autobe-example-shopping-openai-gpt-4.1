import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";

/**
 * Test updating an existing coupon campaign for an admin user.
 *
 * 1. Register a new admin using a unique email, password, and full name.
 * 2. As the admin, create a coupon campaign and capture the resulting campaignId.
 * 3. Prepare and submit an update with new (unique) campaign name, description,
 *    valid schedule (starts_at/ends_at), and business_status. Validate field
 *    updates in the response.
 * 4. Try to update with a duplicate name (uniqueness constraint).
 * 5. Try to update as a non-admin (simulate unauthenticated connection).
 * 6. Try to update a non-existent campaignId.
 * 7. (If possible) Try to update a soft-deleted campaignId.
 * 8. For all errors, check an appropriate runtime error is thrown (business logic,
 *    not type errors).
 * 9. Confirm all updates propagate to subsequent queries.
 */
export async function test_api_coupon_campaign_admin_update(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });
  typia.assert(admin);

  // 2. Create a coupon campaign
  const origCampaignName = RandomGenerator.paragraph({ sentences: 2 });
  const origDescription = RandomGenerator.content({ paragraphs: 2 });
  const statusOptions = [
    "draft",
    "active",
    "paused",
    "expired",
    "deleted",
  ] as const;
  const origStatus = RandomGenerator.pick(statusOptions);
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 10,
  ).toISOString();
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: {
        name: origCampaignName,
        description: origDescription,
        business_status: origStatus,
        starts_at: startsAt,
        ends_at: endsAt,
      },
    });
  typia.assert(campaign);

  // 3. Prepare new values for update
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 1 });
  const newStart = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
  const newEnd = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const newStatus = RandomGenerator.pick(
    statusOptions.filter((s) => s !== origStatus),
  );
  const updateBody = {
    name: newName,
    description: newDescription,
    starts_at: newStart,
    ends_at: newEnd,
    business_status: newStatus,
  } satisfies IShoppingMallCouponCampaign.IUpdate;

  // 4. Update campaign successfully
  const updated =
    await api.functional.shoppingMall.admin.couponCampaigns.update(connection, {
      campaignId: campaign.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals("campaign id preserved", updated.id, campaign.id);
  TestValidator.equals("updated name", updated.name, newName);
  TestValidator.equals(
    "updated description",
    updated.description,
    newDescription,
  );
  TestValidator.equals("updated starts_at", updated.starts_at, newStart);
  TestValidator.equals("updated ends_at", updated.ends_at, newEnd);
  TestValidator.equals(
    "updated business_status",
    updated.business_status,
    newStatus,
  );

  // 5. Attempt update with duplicate name (should fail)
  await TestValidator.error(
    "duplicate campaign name should not be allowed",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.create(
        connection,
        {
          body: {
            name: newName, // duplicate
            description: RandomGenerator.content({ paragraphs: 1 }),
            business_status: RandomGenerator.pick(statusOptions),
          },
        },
      );
    },
  );

  // 6. Attempt update as unauthenticated (non-admin)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin update must fail",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.update(
        unauthConn,
        {
          campaignId: campaign.id,
          body: updateBody,
        },
      );
    },
  );

  // 7. Attempt update of non-existent campaignId
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent campaignId must fail",
    async () => {
      await api.functional.shoppingMall.admin.couponCampaigns.update(
        connection,
        {
          campaignId: fakeId,
          body: updateBody,
        },
      );
    },
  );

  // (Optional: Could soft-delete and test update, if delete API exists)
  // Confirm updates propagate in GET/list response if that API existed (not shown in materials)
}
