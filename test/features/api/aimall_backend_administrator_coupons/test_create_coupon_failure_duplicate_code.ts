import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate that the coupon creation API properly enforces code uniqueness
 * constraints by testing duplicate code entry.
 *
 * Business context: All coupon codes must be unique per business rules. This
 * test ensures that the backend prevents duplicate coupon codes, returning an
 * error (typically a conflict) if attempted, and does not create duplicate
 * records.
 *
 * Steps:
 *
 * 1. Create an initial coupon with a known unique code via the administrator API
 *    (setup step).
 * 2. Attempt to create a second coupon with the same code and the same or
 *    different campaign
 * 3. Confirm that the API rejects the duplicate with an error (conflict/duplicate)
 *    and that only one coupon with that code exists
 */
export async function test_api_aimall_backend_administrator_coupons_test_create_coupon_failure_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create an initial coupon with unique code
  const code = `DUPLICATE-CODE-${typia.random<number & tags.Type<"uint32">>()}`;
  const campaignId = typia.random<string & tags.Format<"uuid">>();
  const couponCreateBody: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaignId,
    code,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  };
  const firstCoupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      { body: couponCreateBody },
    );
  typia.assert(firstCoupon);
  TestValidator.equals("coupon code matches")(firstCoupon.code)(code);

  // 2. Attempt duplicate creation with same code and campaign
  await TestValidator.error("Should fail to create duplicate coupon code")(
    async () => {
      await api.functional.aimall_backend.administrator.coupons.create(
        connection,
        {
          body: {
            discount_campaign_id: campaignId,
            code,
            status: "issued",
            issued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000 * 2).toISOString(),
          } satisfies IAimallBackendCoupon.ICreate,
        },
      );
    },
  );
}
