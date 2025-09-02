import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";
import type { IPageIShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponRestriction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_coupon_restriction_admin_search_success(
  connection: api.IConnection,
) {
  /**
   * End-to-end test to verify admin search/filtering of coupon restrictions.
   * This function performs:
   *
   * 1. Admin registration/authentication
   * 2. Coupon creation
   * 3. Multiple diverse restriction creations for the coupon
   * 4. Search and filter via PATCH endpoint with several scenarios (type, period,
   *    etc.)
   * 5. Assert that filtering and pagination return the expected results
   */
  // 1. Register and authenticate an admin
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create a coupon
  const couponInput: IShoppingMallAiBackendCoupon.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    type: "fixed",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    value: 1000,
    currency: "KRW",
    stackable: true,
    personal: false,
    status: "active",
  };

  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponInput },
    );
  typia.assert(coupon);

  // 3. Create diverse restrictions for the coupon
  const now = new Date();
  const restrictionsData: IShoppingMallAiBackendCouponRestriction.ICreate[] = [
    {
      shopping_mall_ai_backend_coupon_id: coupon.id as string &
        tags.Format<"uuid">,
      start_time: now.toISOString() as string & tags.Format<"date-time">,
      end_time: new Date(now.getTime() + 86400000).toISOString() as string &
        tags.Format<"date-time">,
      is_holiday_restricted: false,
      reason_code: "prod",
    },
    {
      shopping_mall_ai_backend_coupon_id: coupon.id as string &
        tags.Format<"uuid">,
      weekday_bitmask: 0b0111110,
      is_holiday_restricted: true,
      reason_code: "weekday-holiday",
    },
    {
      shopping_mall_ai_backend_coupon_id: coupon.id as string &
        tags.Format<"uuid">,
      start_time: new Date(now.getTime() + 7200000).toISOString() as string &
        tags.Format<"date-time">,
      end_time: new Date(now.getTime() + 259200000).toISOString() as string &
        tags.Format<"date-time">,
      shopping_mall_ai_backend_channel_category_id: typia.random<
        string & tags.Format<"uuid">
      >(),
      is_holiday_restricted: null,
      reason_code: "cat",
    },
  ];
  const restrictions: IShoppingMallAiBackendCouponRestriction[] = [];
  for (const r of restrictionsData) {
    const created =
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          body: r,
        },
      );
    typia.assert(created);
    restrictions.push(created);
  }

  // 4. Test search/filter: by reason_code, time range, holiday, weekday, category

  // 4-1. Filter by reason_code (unique to each restriction)
  for (const filter of ["prod", "weekday-holiday", "cat"]) {
    const searchResp =
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.index(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          body: { reason_code: filter },
        },
      );
    typia.assert(searchResp);
    TestValidator.predicate(
      `filter reason_code=${filter} only returns that reason`,
      searchResp.data.every((x) => x.reason_code === filter),
    );
    TestValidator.predicate(
      `filter reason_code=${filter} returns 1 result`,
      searchResp.data.length === 1,
    );
  }

  // 4-2. Filter by start_time (should return 2 that have start_time within period)
  const firstRestrictionStart = restrictionsData[0].start_time!;
  const lastRestrictionEnd = restrictionsData[2].end_time!;
  const searchByPeriod =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.index(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {
          start_time_from: firstRestrictionStart,
          end_time_to: lastRestrictionEnd,
        },
      },
    );
  typia.assert(searchByPeriod);
  TestValidator.predicate(
    `start_time_from+end_time_to filters only restrictions within period`,
    searchByPeriod.data.every(
      (x) =>
        x.start_time &&
        x.end_time &&
        x.start_time >= firstRestrictionStart &&
        x.end_time <= lastRestrictionEnd,
    ),
  );

  // 4-3. Filter by is_holiday_restricted:true
  const holidayTrue =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.index(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: { is_holiday_restricted: true },
      },
    );
  typia.assert(holidayTrue);
  TestValidator.predicate(
    `is_holiday_restricted:true only returns holiday restrictions`,
    holidayTrue.data.every((x) => x.is_holiday_restricted === true),
  );

  // 4-4. Pagination: limit to 2 results per page and verify correct paging
  const paged =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.index(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: { limit: 2, page: 1 },
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    `pagination.limit = 2 returns at most 2 items`,
    paged.data.length <= 2,
  );
  TestValidator.predicate(
    `pagination meta current=1`,
    paged.pagination.current === 1,
  );
}
