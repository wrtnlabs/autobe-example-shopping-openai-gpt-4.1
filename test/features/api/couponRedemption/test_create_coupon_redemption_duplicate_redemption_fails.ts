import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validates that the coupon redemption endpoint enforces single-use or per-user
 * redemption limits by preventing duplicate redemptions for the same coupon and
 * customer.
 *
 * Business context: Many coupon or discount systems enforce business logic that
 * restricts how many times a particular user/customer can redeem a given
 * coupon, typically once per user. Allowing duplicate redemptions can lead to
 * abuse or unintended behavior. This test sets up a new coupon and performs two
 * consecutive redemption attempts by the same customer. The second attempt
 * should trigger a validation or business rule error such as "already redeemed"
 * or limit exceeded.
 *
 * Step-by-step process:
 *
 * 1. Create a new coupon for a specific customer (or universal if not required).
 * 2. Successfully redeem the coupon for the first time as the target customer
 *    (should succeed).
 * 3. Attempt to immediately redeem the same coupon again for the same customer
 *    (should fail business validation).
 * 4. Validate that the second attempt triggers a business logic or validation
 *    error, not success. No duplicate records should be created.
 */
export async function test_api_couponRedemption_test_create_coupon_redemption_duplicate_redemption_fails(
  connection: api.IConnection,
) {
  // 1. Create a coupon for a target customer and campaign
  const discount_campaign_id = typia.random<string & tags.Format<"uuid">>();
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const issued_at = now.toISOString();
  const expires_at = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const coupon_code = RandomGenerator.alphaNumeric(12);

  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id,
          customer_id,
          code: coupon_code,
          status: "issued",
          issued_at,
          expires_at,
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 2. Perform the first redemption (should succeed)
  const redemption_data = {
    coupon_id: coupon.id,
    customer_id,
    discount_campaign_id,
    redeemed_at: new Date().toISOString(),
    redemption_status: "success",
  } satisfies IAimallBackendCouponRedemption.ICreate;

  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      { body: redemption_data },
    );
  typia.assert(redemption);
  TestValidator.equals("first redemption - coupon id matches")(
    redemption.coupon_id,
  )(coupon.id);
  TestValidator.equals("first redemption - customer id matches")(
    redemption.customer_id,
  )(customer_id);
  TestValidator.equals("first redemption - status success")(
    redemption.redemption_status,
  )("success");

  // 3. Attempt duplicate redemption for same coupon/customer (should fail)
  await TestValidator.error("duplicate redemption attempt should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.couponRedemptions.create(
        connection,
        { body: { ...redemption_data, redeemed_at: new Date().toISOString() } },
      );
    },
  );
}
