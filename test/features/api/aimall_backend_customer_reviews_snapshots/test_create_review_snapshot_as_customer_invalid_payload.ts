import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 고객이 올바르지 않은 페이로드(예: media_uri 누락, 잘못된 값, reviewId uuid 미만, schema 위반 등)로 리뷰
 * 스냅샷 등록을 시도시 API에서 반드시 422 등 validation 오류 혹은 명확한 에러가 발생하는지 검증합니다.
 *
 * [사전 조건]
 *
 * 1. 정상적으로 고객 계정을 생성한다.
 * 2. 정상적으로 리뷰를 등록한다.
 *
 * [테스트]
 *
 * 1. 존재하지 않는 reviewId (정상 uuid이나 실제 row 없음)에 대해 실패를 반환하는지 확인
 * 2. ReviewId는 정상이나 필수(media_uri) 누락시 schema validation 에러를 반환하는지 확인
 * 3. Media_uri 값이 빈 문자열 등 부적합일 때 오류가 발생하는지 확인
 * 4. ReviewId가 uuid 형태가 아닐 때 schema validation 에러가 발생하는지 확인
 *
 * 모든 케이스 별 TestValidator.error로 실패 보장만 검증, 추가 리소스 생성 방지는 실제 배치 DB/환경에서 별도 검증 또는
 * fixture-cleanup으로 처리함
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_create_review_snapshot_as_customer_invalid_payload(
  connection: api.IConnection,
) {
  // 1. 정상 고객 계정 생성
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. 정상 리뷰 등록
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // (1) 존재하지 않는 reviewId(uuid는 정상이나 실제 row 없음) → 실패 보장
  await TestValidator.error("존재하지 않는 reviewId는 validation 에러 필요")(
    () =>
      api.functional.aimall_backend.customer.reviews.snapshots.create(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(), // 실제 존재하지 않을 가능성 높은 new uuid
          body: {
            media_uri: "https://example.com/media/valid.jpg",
          } satisfies IAimallBackendSnapshot.ICreate,
        },
      ),
  );

  // (2) 필수값 media_uri 누락
  await TestValidator.error(
    "필수 값 media_uri 누락 시 schema validation 에러 필요",
  )(() =>
    api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          // media_uri 누락 intentionally
        } as any,
      },
    ),
  );

  // (3) media_uri가 빈 문자열 등 부적합 시
  await TestValidator.error(
    "media_uri가 빈 문자열 등 비정상인 경우 실패해야 함",
  )(() =>
    api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: "",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    ),
  );

  // (4) reviewId가 uuid 포맷 아님(명백히 schema 위반)
  await TestValidator.error(
    "잘못된 reviewId 포맷(uuid 아님) 입력시 schema validation 에러 기대",
  )(() =>
    api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: "this_is_not_a_uuid" as any,
        body: {
          media_uri: "https://example.com/media/photo.jpg",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    ),
  );
}
