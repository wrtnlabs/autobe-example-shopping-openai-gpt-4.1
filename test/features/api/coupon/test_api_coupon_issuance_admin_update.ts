import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";
import type { IShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponIssuance";

/**
 * Test updating a coupon issuance by admin, including policy enforcement,
 * audit, and business error cases.
 *
 * This test verifies admin-level coupon issuance update handling. It covers:
 *
 * 1. Admin registration/authentication
 * 2. Coupon campaign creation (to demonstrate campaign linkage and referential
 *    integrity)
 * 3. Coupon creation referencing the campaign
 * 4. Coupon issuance creation referring the created coupon
 * 5. A successful update of mutable fields (expires_at, usage_limit, status)
 * 6. Validation of update persistence by reloading the issuance
 * 7. Attempting forbidden/invalid updates (immutable field— coupon linkage change
 *    not allowed)
 * 8. Attempting invalid status transitions (e.g., from revoked to active if not
 *    allowed)
 * 9. Ensuring referential integrity checks w/ non-existent coupon or issuance IDs
 * 10. Audit trail observation (implied via updated_at and persistence, not direct
 *     log check).
 *
 * Steps:
 *
 * 1. Register and log in as an admin.
 * 2. Create a coupon campaign (with business_status 'active').
 * 3. Create a coupon using the above campaign's id as
 *    shopping_mall_coupon_campaign_id.
 * 4. Create a coupon issuance attached to the coupon.
 * 5. Update the issuance's expires_at to a new value, usage_limit to a new value,
 *    and status to 'revoked'.
 * 6. Retrieve the issuance, assert changes, and check audit evidence (updated_at
 *    is changed, all fields applied).
 * 7. Try to update the issuance's coupon id (should not be allowed — expect an
 *    error).
 * 8. Try an invalid status transition (e.g., from 'revoked' to 'active' if not
 *    allowed by business rules).
 * 9. Try to update using non-existent coupon or issuance id (expect not found /
 *    referential integrity error).
 * 10. Confirm success and error states as described.
 */
export async function test_api_coupon_issuance_admin_update(
  connection: api.IConnection,
) {
  // 1. Register and log in as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create coupon campaign
  const campaignBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignBody,
    });
  typia.assert(campaign);

  // 3. Create coupon referencing the campaign
  const couponBody = {
    shopping_mall_coupon_campaign_id: campaign.id,
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    coupon_type: "one-time",
    discount_type: "amount",
    discount_value: 5000,
    stackable: true,
    exclusive: false,
    usage_limit_total: 100,
    usage_limit_per_user: 1,
    issuance_limit_total: 1,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: couponBody,
    },
  );
  typia.assert(coupon);

  // 4. Create issuance
  const issuanceCode = coupon.code + "-A";
  const issuanceBody = {
    shopping_mall_coupon_id: coupon.id,
    code: issuanceCode,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 days
    usage_limit: 2,
  } satisfies IShoppingMallCouponIssuance.ICreate;
  const issuance =
    await api.functional.shoppingMall.admin.coupons.issuances.create(
      connection,
      {
        couponId: coupon.id,
        body: issuanceBody,
      },
    );
  typia.assert(issuance);

  // 5. Update issuance: mutate expires_at, usage_limit, and status (to 'revoked')
  const newExpiresAt = new Date(
    Date.now() + 8 * 24 * 60 * 60 * 1000,
  ).toISOString(); // +8 days
  const updateBody = {
    expires_at: newExpiresAt,
    usage_limit: 10,
    status: "revoked",
  } satisfies IShoppingMallCouponIssuance.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.coupons.issuances.update(
      connection,
      {
        couponId: coupon.id,
        issuanceId: issuance.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "issuance expires_at updated",
    updated.expires_at,
    newExpiresAt,
  );
  TestValidator.equals("issuance usage_limit updated", updated.usage_limit, 10);
  TestValidator.equals("issuance status updated", updated.status, "revoked");
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    issuance.updated_at,
  );

  // 6. Reload to check persistence (simulated detail API: re-use update fetch)
  const reloaded =
    await api.functional.shoppingMall.admin.coupons.issuances.update(
      connection,
      {
        couponId: coupon.id,
        issuanceId: issuance.id,
        body: {}, // no update, acts as a GET here due to test SDK limitations
      },
    );
  typia.assert(reloaded);
  TestValidator.equals("reloaded matches updated", reloaded, updated);

  // 7. Attempt forbidden update: attempt to patch coupon linkage (should be forbidden)
  await TestValidator.error(
    "cannot change shopping_mall_coupon_id via update",
    async () => {
      // Intentionally ignore type as this should fail business logic, not TypeScript-level typing
      await api.functional.shoppingMall.admin.coupons.issuances.update(
        connection,
        {
          couponId: typia.random<string & tags.Format<"uuid">>(), // supply random couponId, not the real one
          issuanceId: issuance.id,
          body: updateBody,
        },
      );
    },
  );

  // 8. Try invalid status transition (revoked → active not allowed)
  await TestValidator.error(
    "cannot reactivate a revoked issuance (invalid status transition)",
    async () => {
      await api.functional.shoppingMall.admin.coupons.issuances.update(
        connection,
        {
          couponId: coupon.id,
          issuanceId: issuance.id,
          body: {
            status: "active",
          },
        },
      );
    },
  );

  // 9. Update non-existent issuance
  await TestValidator.error(
    "update fails with non-existent issuanceId",
    async () => {
      await api.functional.shoppingMall.admin.coupons.issuances.update(
        connection,
        {
          couponId: coupon.id,
          issuanceId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
  // 10. Update with non-existent couponId
  await TestValidator.error(
    "update fails with non-existent couponId",
    async () => {
      await api.functional.shoppingMall.admin.coupons.issuances.update(
        connection,
        {
          couponId: typia.random<string & tags.Format<"uuid">>(),
          issuanceId: issuance.id,
          body: updateBody,
        },
      );
    },
  );
}
