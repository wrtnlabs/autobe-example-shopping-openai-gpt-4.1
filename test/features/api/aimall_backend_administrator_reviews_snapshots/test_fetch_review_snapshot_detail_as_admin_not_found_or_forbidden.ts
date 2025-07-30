import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 관리자 권한으로 존재하지 않는 reviewId 또는 snapshotId로 스냅샷 상세를 조회할 때 not found(404)나
 * forbidden(403) 오류가 발생하는지 검증합니다.
 *
 * - 실제 고객 리뷰를 하나 생성해 정상 reviewId를 준비한 상태에서, 무작위 snapshotId(UUID)로 조회를 시도하여 오류 발생을
 *   유도합니다.
 * - 완전히 무작위(reviewId + snapshotId 둘 다 랜덤 UUID) 조합으로도 재현하여 오류 반환을 확인합니다.
 * - Soft delete(삭제된 엔티티) 케이스는 API·DTO 미지원으로 생략.
 *
 * [검증 절차]
 *
 * 1. 고객 리뷰 생성 → 정상 reviewId 확보
 * 2. 정상 reviewId + 잘못된 snapshotId 조합으로 조회: 오류(404 또는 403) 발생해야 함
 * 3. 완전 무작위 reviewId + snapshotId 조합으로 조회: 오류(404 또는 403) 발생해야 함
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_at_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // 1. 고객 리뷰 생성 (테스트 대상 reviewId 확보)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "[관리자 오류조회 테스트] 존재하지 않는 스냅샷",
        body: "이 리뷰는 관리자용 not found/forbidden 오류 테스트의 리뷰입니다.",
        rating: 4,
      },
    },
  );
  typia.assert(review);
  const validReviewId = review.id;
  const invalidSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. [존재하는 reviewId + 존재하지 않는 snapshotId] case: 오류 확인
  await TestValidator.error(
    "존재하는 reviewId + 잘못된 snapshotId에 대해 오류 반환",
  )(() =>
    api.functional.aimall_backend.administrator.reviews.snapshots.at(
      connection,
      { reviewId: validReviewId, snapshotId: invalidSnapshotId },
    ),
  );

  // 3. [존재하지 않는 reviewId + 존재하지 않는 snapshotId] case: 오류 확인
  await TestValidator.error("존재하지 않는 reviewId + snapshotId 모두 잘못됨")(
    () =>
      api.functional.aimall_backend.administrator.reviews.snapshots.at(
        connection,
        { reviewId: invalidReviewId, snapshotId: invalidSnapshotId },
      ),
  );
}
