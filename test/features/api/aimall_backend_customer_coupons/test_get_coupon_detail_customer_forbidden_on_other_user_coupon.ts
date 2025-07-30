import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate customer cannot access another customer's coupon.
 *
 * Business context: Coupons are issued personally to customers; security
 * requires that customers cannot read the full details of coupons belonging to
 * others, as these may reveal sensitive campaign/assignment status.
 *
 * Steps:
 *
 * 1. (ADMIN) Create two coupons, each assigned to a different customer UUID.
 * 2. Simulate customer authentication for the first customer (assume connection is
 *    now for customer1).
 * 3. Attempt to fetch details of coupon belonging to the second customer via
 *    customer-coupon endpoint.
 * 4. Expect an error: HTTP status 403/404 (forbidden/not-found, as per
 *    implementation).
 * 5. Optionally, verify that a customer CAN fetch their own coupon.
 */
export async function test_api_aimall_backend_customer_coupons_test_get_coupon_detail_customer_forbidden_on_other_user_coupon(
  connection: api.IConnection,
) {
  // 1. (ADMIN) Create two coupons assigned to different customers
  const customer1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const adminCoupon1 =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId,
          customer_id: customer1,
          code: RandomGenerator.alphaNumeric(8),
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(adminCoupon1);

  const adminCoupon2 =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId,
          customer_id: customer2,
          code: RandomGenerator.alphaNumeric(8),
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(adminCoupon2);

  // Step 2: Simulate authentication as customer1 (assume connection is now for customer1)

  // Step 3: Customer1 tries to get coupon2's detail (should fail)
  await TestValidator.error("should not access another's coupon")(async () => {
    await api.functional.aimall_backend.customer.coupons.at(connection, {
      couponId: adminCoupon2.id,
    });
  });

  // Step 4: Optionally, verify customer1 CAN reach their own coupon
  const coupon1 = await api.functional.aimall_backend.customer.coupons.at(
    connection,
    {
      couponId: adminCoupon1.id,
    },
  );
  typia.assert(coupon1);
  TestValidator.equals("coupon1.customer_id")(coupon1.customer_id)(customer1);
}
