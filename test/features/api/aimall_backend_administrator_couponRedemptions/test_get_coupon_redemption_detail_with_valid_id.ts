import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validates that an administrator can retrieve the complete details of a coupon
 * redemption event by its unique ID.
 *
 * This test ensures backoffice audit/support systems can fetch detailed coupon
 * redemption event data for fraud investigation or compliance workflows. It
 * guarantees that, given a valid coupon redemption ID, the system returns all
 * record fields, including coupon/campaign context, redemption status,
 * customer, and order/product information.
 *
 * Test Workflow:
 *
 * 1. Create a new coupon redemption event record (using realistic, random test
 *    values).
 * 2. Fetch the event details by its ID using the admin API endpoint.
 * 3. Assert that all the fields in the response exactly match what was created
 *    (incl. all required and optional fields).
 * 4. Perform assertions for audit/compliance fields and check that nullable
 *    associations (campaign/order/product) are handled correctly.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_get_coupon_redemption_detail_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new coupon redemption record for testing.
  //    Randomize some nullable fields (campaign, order, product) for better coverage.
  const coupon_id = typia.random<string & tags.Format<"uuid">>();
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const discount_campaign_id =
    Math.random() < 0.5 ? typia.random<string & tags.Format<"uuid">>() : null;
  const order_id =
    Math.random() < 0.5 ? typia.random<string & tags.Format<"uuid">>() : null;
  const product_id =
    Math.random() < 0.5 ? typia.random<string & tags.Format<"uuid">>() : null;
  const redeemed_at = new Date().toISOString();
  const redemption_status = "success";

  const created: IAimallBackendCouponRedemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id,
          customer_id,
          discount_campaign_id,
          redeemed_at,
          redemption_status,
          order_id,
          product_id,
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(created);

  // 2. Fetch the coupon redemption record using the created event's ID
  const result: IAimallBackendCouponRedemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.at(
      connection,
      { couponRedemptionId: created.id },
    );
  typia.assert(result);

  // 3. Assert all properties match what was created (including handling of nullable/optional fields)
  TestValidator.equals("coupon redemption id matches")(result.id)(created.id);
  TestValidator.equals("coupon id matches")(result.coupon_id)(
    created.coupon_id,
  );
  TestValidator.equals("customer id matches")(result.customer_id)(
    created.customer_id,
  );
  TestValidator.equals("redemption status matches")(result.redemption_status)(
    created.redemption_status,
  );
  TestValidator.equals("redeemed_at matches")(result.redeemed_at)(
    created.redeemed_at,
  );
  TestValidator.equals("campaign id matches")(
    result.discount_campaign_id ?? null,
  )(created.discount_campaign_id ?? null);
  TestValidator.equals("order id matches")(result.order_id ?? null)(
    created.order_id ?? null,
  );
  TestValidator.equals("product id matches")(result.product_id ?? null)(
    created.product_id ?? null,
  );
}
