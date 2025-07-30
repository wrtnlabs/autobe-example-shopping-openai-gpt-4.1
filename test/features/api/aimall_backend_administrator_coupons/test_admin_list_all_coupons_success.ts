import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Test that an administrator can retrieve a complete list of all coupon records
 * in the system.
 *
 * Business context: This scenario ensures the administrator sees all types of
 * coupon records—both unassigned (global) and customer-specific—in a single
 * query, validating the system's role-based coupon visibility and data
 * integrity for compliance and campaign tracking.
 *
 * Steps:
 *
 * 1. Create a random campaign UUID and a random customer UUID (since no
 *    campaign/customer creation APIs are present).
 * 2. Create a global coupon (not linked to a customer) via POST
 *    /aimall-backend/administrator/coupons.
 * 3. Create a customer-specific coupon (linked to a customer) via a second POST.
 * 4. Fetch all coupons as administrator (GET
 *    /aimall-backend/administrator/coupons).
 * 5. Assert that both coupons are returned in the list, with their code, campaign,
 *    and status fields matching the creation payloads.
 */
export async function test_api_aimall_backend_administrator_coupons_test_admin_list_all_coupons_success(
  connection: api.IConnection,
) {
  // 1. Set up a synthetic campaign UUID and customer UUID
  const campaignId: string = typia.random<string & tags.Format<"uuid">>();
  const customerId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a global/unassigned coupon (customer_id: null)
  const couponGlobal =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId,
          customer_id: null,
          code: RandomGenerator.alphaNumeric(10),
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(couponGlobal);

  // 3. Create a customer-specific coupon (customer_id: not null)
  const couponPersonal =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId,
          customer_id: customerId,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 60,
          ).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(couponPersonal);

  // 4. Retrieve all coupons as administrator
  const result =
    await api.functional.aimall_backend.administrator.coupons.index(connection);
  typia.assert(result);

  // 5. Validate both created coupons are returned, with key field correctness
  TestValidator.predicate("global coupon present")(
    !!result.data?.find((c) => c.id === couponGlobal.id),
  );
  TestValidator.predicate("personal coupon present")(
    !!result.data?.find((c) => c.id === couponPersonal.id),
  );

  const globalFound = result.data?.find((c) => c.id === couponGlobal.id);
  const personalFound = result.data?.find((c) => c.id === couponPersonal.id);
  if (globalFound) {
    TestValidator.equals("coupon campaign (global)")(
      globalFound.discount_campaign_id,
    )(campaignId);
    TestValidator.equals("coupon code (global)")(globalFound.code)(
      couponGlobal.code,
    );
    TestValidator.equals("coupon status (global)")(globalFound.status)(
      couponGlobal.status,
    );
    TestValidator.equals("customer_id (global)")(globalFound.customer_id)(null);
  }
  if (personalFound) {
    TestValidator.equals("coupon campaign (personal)")(
      personalFound.discount_campaign_id,
    )(campaignId);
    TestValidator.equals("coupon code (personal)")(personalFound.code)(
      couponPersonal.code,
    );
    TestValidator.equals("coupon status (personal)")(personalFound.status)(
      couponPersonal.status,
    );
    TestValidator.equals("customer_id (personal)")(personalFound.customer_id)(
      customerId,
    );
  }
}
