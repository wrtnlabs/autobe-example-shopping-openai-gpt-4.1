import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * [E2E] 쿠폰 사용 이력 복수 필터 검색 및 페이징 검증
 *
 * 복수 필터(customer_id, campaign_id, redemption_status, 사용시점 구간 등)를 활용해 관리자 쿠폰 이력
 * 검색(PATCH /aimall-backend/administrator/couponRedemptions)을 수행, 각 케이스별로 반환 결과가
 * 정확히 필터 조건에 부합하며 페이징 정보도 옳은지 검증한다.
 *
 * 절차:
 *
 * 1. 캠페인/고객별로 2개 쿠폰을 각각 생성한다.
 * 2. 다양한 redemption_status+기간별로 쿠폰 사용 이력(3건 이상) 생성
 * 3. 다양한 필터(customer_id/campaign_id/status/기간, 조합, 0건 매치, 전체 조회)로 검색
 * 4. 각 케이스별로 반환 데이터가 정확히 조건 일치, 불일치 row 없음, 페이징 정보/카운트 일관성 검증
 * 5. 경계값, 예외, 조합 조건 모두 망라해서 최종 검증
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_search_coupon_redemptions_with_multiple_filters(
  connection: api.IConnection,
) {
  // 1. 테스트용 쿠폰 2개(캠페인/고객 유니크) 생성
  const campaignId1 = typia.random<string & tags.Format<"uuid">>();
  const campaignId2 = typia.random<string & tags.Format<"uuid">>();
  const customerId1 = typia.random<string & tags.Format<"uuid">>();
  const customerId2 = typia.random<string & tags.Format<"uuid">>();

  const coupon1 =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId1,
          customer_id: customerId1,
          code: "CODE1-SEARCH-TEST",
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(coupon1);
  const coupon2 =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId2,
          customer_id: customerId2,
          code: "CODE2-SEARCH-TEST",
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 60,
          ).toISOString(),
        },
      },
    );
  typia.assert(coupon2);

  // 2. 서로 다른 redemption_status/기간별 쿠폰 사용 이력 복수 생성
  const now = new Date();
  const redemption1 =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon1.id,
          customer_id: customerId1,
          discount_campaign_id: campaignId1,
          redeemed_at: new Date(
            now.getTime() - 1000 * 60 * 60 * 48,
          ).toISOString(), // 이틀전
          redemption_status: "success",
          order_id: null,
          product_id: null,
        },
      },
    );
  typia.assert(redemption1);
  const redemption2 =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon2.id,
          customer_id: customerId2,
          discount_campaign_id: campaignId2,
          redeemed_at: new Date(
            now.getTime() - 1000 * 60 * 60 * 24,
          ).toISOString(), // 하루전
          redemption_status: "failed",
          order_id: null,
          product_id: null,
        },
      },
    );
  typia.assert(redemption2);
  const redemption3 =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon1.id,
          customer_id: customerId2,
          discount_campaign_id: campaignId1,
          redeemed_at: new Date(
            now.getTime() - 1000 * 60 * 60 * 12,
          ).toISOString(), // 12시간전
          redemption_status: "failed",
          order_id: null,
          product_id: null,
        },
      },
    );
  typia.assert(redemption3);

  // 3-1. customer_id 필터: 단일 고객 이력만 반환
  let page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: { customer_id: customerId1 } },
    );
  typia.assert(page);
  for (const item of page.data) {
    TestValidator.equals("customer filter")(item.customer_id)(customerId1);
  }
  TestValidator.predicate("pagination reflects filter")(
    page.pagination.records === page.data.length,
  );

  // 3-2. campaign_id 필터: 특정 캠페인 이력만 반환
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: { discount_campaign_id: campaignId2 } },
    );
  typia.assert(page);
  for (const item of page.data) {
    TestValidator.equals("campaign filter")(item.discount_campaign_id)(
      campaignId2,
    );
  }
  TestValidator.predicate("pagination reflects filter")(
    page.pagination.records === page.data.length,
  );

  // 3-3. redemption_status("failed") 필터: 실패 이력만 반환
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: { redemption_status: "failed" } },
    );
  typia.assert(page);
  for (const item of page.data) {
    TestValidator.equals("status filter")(item.redemption_status)("failed");
  }
  TestValidator.predicate("pagination reflects filter")(
    page.pagination.records === page.data.length,
  );

  // 3-4. redeemed_from ~ redeemed_to (24시간 이내) 기간 범위 필터
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
  const to = now.toISOString();
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: { redeemed_from: from, redeemed_to: to } },
    );
  typia.assert(page);
  for (const item of page.data) {
    TestValidator.predicate("date range filter")(
      new Date(item.redeemed_at).getTime() >= new Date(from).getTime() &&
        new Date(item.redeemed_at).getTime() <= new Date(to).getTime(),
    );
  }

  // 3-5. 복합조건(customer_id + campaign_id)
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: { customer_id: customerId2, discount_campaign_id: campaignId1 } },
    );
  typia.assert(page);
  for (const item of page.data) {
    TestValidator.equals("customer filter")(item.customer_id)(customerId2);
    TestValidator.equals("campaign filter")(item.discount_campaign_id)(
      campaignId1,
    );
  }

  // 3-6. 복합(status + 기간) 조건
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      {
        body: {
          redemption_status: "failed",
          redeemed_from: from,
          redeemed_to: to,
        },
      },
    );
  typia.assert(page);
  for (const item of page.data) {
    TestValidator.equals("status filter")(item.redemption_status)("failed");
    TestValidator.predicate("date range filter")(
      new Date(item.redeemed_at).getTime() >= new Date(from).getTime() &&
        new Date(item.redeemed_at).getTime() <= new Date(to).getTime(),
    );
  }

  // 3-7. 0건 매치 (존재하지 않는 customer_id)
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: { customer_id: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(page);
  TestValidator.equals("empty match")(page.data.length)(0);

  // 3-8. 넓은 전체 조회 (pagination 정상동작, 레코드 카운트/전체 포함)
  page =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      { body: {} },
    );
  typia.assert(page);
  TestValidator.predicate("전체 레코드 포함")(page.data.length >= 3);
  TestValidator.equals("pagination.records >= data.length")(
    page.pagination.records >= page.data.length,
  )(true);
}
