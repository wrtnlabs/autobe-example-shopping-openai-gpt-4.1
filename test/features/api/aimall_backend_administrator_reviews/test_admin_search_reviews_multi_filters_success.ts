import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 리뷰 다중 조건 검색 검증 (Patch Search Multi-Filter)
 *
 * - 다양한 상품/고객/평점/작성일 리뷰 데이터 생성
 * - 일부 리뷰는 soft-delete (deleted_at 처리)
 * - 관리자 권한으로 다중 필터(PATCH /aimall-backend/administrator/reviews) 검색 수행
 *
 *   - 상품 ID, 평점 범위, 생성일 범위, 그리고 조합 조건별 탐색
 * - Soft-deleted 리뷰는 조회 결과에 표시되지 않아야 함을 단계별 검증
 * - 페이지네이션 및 메타데이터(total, page) 정확성 보장
 */
export async function test_api_aimall_backend_administrator_reviews_test_admin_search_reviews_multi_filters_success(
  connection: api.IConnection,
) {
  // 1. 상품, 평점, 작성일 다양화하여 리뷰 데이터 다수 생성 (고객ID 직접 비교 불가)
  const products = ArrayUtil.repeat(5)(() =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const customers = ArrayUtil.repeat(3)(() =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const allReviews: IAimallBackendReview[] = [];

  for (const product_id of products) {
    for (const customer_id of customers) {
      const rating = RandomGenerator.pick([1, 2, 3, 4, 5]);
      const daysAgo = RandomGenerator.pick([0, 1, 2, 5, 10]);
      const review: IAimallBackendReview =
        await api.functional.aimall_backend.customer.reviews.create(
          connection,
          {
            body: {
              product_id,
              title: `Review P${product_id.slice(0, 4)} R${rating}`,
              body: RandomGenerator.content()()(),
              rating,
            } satisfies IAimallBackendReview.ICreate,
          },
        );
      typia.assert(review);
      review.created_at = new Date(
        Date.now() - daysAgo * 24 * 3600 * 1000,
      ).toISOString();
      review.updated_at = review.created_at;
      allReviews.push(review);
    }
  }

  // 2. rating=1 리뷰들을 soft-delete
  const softDeleted: IAimallBackendReview[] = [];
  for (const review of allReviews) {
    if (review.rating === 1) {
      await api.functional.aimall_backend.customer.reviews.erase(connection, {
        reviewId: review.id,
      });
      review.deleted_at = new Date().toISOString();
      softDeleted.push(review);
    }
  }

  // activeReviews: deleted 리뷰 제외한 나머지 리뷰
  const activeReviews = allReviews.filter((r) => !softDeleted.includes(r));

  // 3-a. 상품 ID 조건 단일 필터 테스트
  const filterProductId = products[1];
  const resByProduct =
    await api.functional.aimall_backend.administrator.reviews.search(
      connection,
      { body: { product_id: filterProductId } },
    );
  typia.assert(resByProduct);
  TestValidator.predicate("상품 ID 검색 시 soft-delete 리뷰 없음")(
    resByProduct.data.every(
      (r) =>
        r.product_id === filterProductId &&
        !softDeleted.find((d) => d.id === r.id),
    ),
  );

  // 3-b. 평점 하한 필터 테스트 (>= 4)
  const ratingMin = 4;
  const resByRating =
    await api.functional.aimall_backend.administrator.reviews.search(
      connection,
      { body: { rating_min: ratingMin } },
    );
  typia.assert(resByRating);
  TestValidator.predicate("평점 하한 필터링, soft-delete 제외")(
    resByRating.data.every(
      (r) => r.rating >= ratingMin && !softDeleted.find((d) => d.id === r.id),
    ),
  );

  // 3-c. 최근 일주일 작성 리뷰 필터
  const fromTime = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const resByDate =
    await api.functional.aimall_backend.administrator.reviews.search(
      connection,
      { body: { created_from: fromTime } },
    );
  typia.assert(resByDate);
  TestValidator.predicate("최근 작성일 범위내, soft-delete 제외")(
    resByDate.data.every(
      (r) =>
        r.created_at >= fromTime && !softDeleted.find((d) => d.id === r.id),
    ),
  );

  // 3-d. 상품 ID + 평점 상한 복합 조건
  const ratingMax = 3;
  const resCombined =
    await api.functional.aimall_backend.administrator.reviews.search(
      connection,
      { body: { product_id: filterProductId, rating_max: ratingMax } },
    );
  typia.assert(resCombined);
  TestValidator.predicate("상품+평점 상한 복합, soft-delete 없음")(
    resCombined.data.every(
      (r) =>
        r.product_id === filterProductId &&
        r.rating <= ratingMax &&
        !softDeleted.find((d) => d.id === r.id),
    ),
  );

  // 4. 페이지네이션 및 메타데이터 검증
  const pageLimit = 2;
  const paged =
    await api.functional.aimall_backend.administrator.reviews.search(
      connection,
      { body: { limit: pageLimit, page: 1 } },
    );
  typia.assert(paged);
  TestValidator.equals("pagination.limit")(paged.pagination.limit)(pageLimit);
  TestValidator.equals("pagination.current")(paged.pagination.current)(1);
  TestValidator.equals("pagination.records")(paged.pagination.records)(
    activeReviews.length,
  );
  TestValidator.equals("pagination.pages")(paged.pagination.pages)(
    Math.ceil(activeReviews.length / pageLimit),
  );
}
