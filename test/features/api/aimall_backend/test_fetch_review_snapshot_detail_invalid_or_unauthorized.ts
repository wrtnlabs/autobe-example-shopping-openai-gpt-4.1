import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 존재하지 않거나 권한 없는 상태에서 리뷰 스냅샷 상세 조회 실패 검증
 *
 * 본 테스트는 aimall_backend_reviews(상품 리뷰) 엔티티의 특정 리뷰에 대한 스냅샷 상세 정보를 조회하는 과정에서, 다음과
 * 같은 실패 시나리오를 검증합니다.
 *
 * - 존재하지 않는 snapshotId(임의 UUID)로 접근 시, API가 404 not found(또는 비슷한 실패)를 반환하는지
 *   확인합니다.
 * - (인증 체계를 전환 가능한 경우) seller나 admin이 아닌 권한에서 접근 시 403 forbidden(또는 적합한 거부 응답)
 *   발생을 검증합니다. (단, 테스트 환경에서 별도 인증/권한 switching 불가라면 비로그인 또는 주어진 일반
 *   connection만으로 최소 검증합니다.)
 *
 * [테스트 프로세스]
 *
 * 1. '/aimall-backend/customer/reviews'를 이용하여, 테스트 전용 리뷰 데이터를 생성합니다. (스냅샷 등록 없이 순수
 *    리뷰만 생성—이후 존재하지 않는 스냅샷 접근 트리거용)
 * 2. 생성한 리뷰의 ID(reviewId)와 임의의 UUID(snapshotId) 조합으로, 리뷰의 스냅샷 상세조회 API 호출 → 존재하지
 *    않는 경우 404/실패 발생 여부 검증합니다.
 * 3. (확장) 인증/권한이 seller/admin이 아닌 경우 동일 API 요청 → 403 forbidden(또는 적합한 실패) 반환 검증
 *    (단, 본 테스트 내 전환 API 미제공 시 생략 또는 비로그인 connection 등으로 대체가능)
 *
 * @author
 */
export async function test_api_aimall_backend_test_fetch_review_snapshot_detail_invalid_or_unauthorized(
  connection: api.IConnection,
) {
  // 1. 리뷰 생성(테스트용, 스냅샷 없음)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. 존재하지 않는 snapshotId로 접근 시 404 등 실패 발생 검증
  await TestValidator.error("404 not found when using random snapshotId")(() =>
    api.functional.aimall_backend.seller.reviews.snapshots.at(connection, {
      reviewId: review.id,
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 3. (선택) 권한 미달(비로그인/비판매자) 상태 요청도 테스트 환경 가용성에 따라 추가 구현 가능
}
