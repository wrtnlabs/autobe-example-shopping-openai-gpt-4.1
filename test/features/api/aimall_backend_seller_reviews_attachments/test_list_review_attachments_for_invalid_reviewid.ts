import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 존재하지 않거나 잘못된 리뷰 ID로 첨부파일 목록 요청 시 적절한 에러 발생을 검증하는 테스트
 *
 * - 판매자 계정으로 실존하지 않는 reviewId를 지정하여 첨부파일 목록 API를 조회할 때 404(혹은 적절한) 에러 발생을 확인함
 * - 잘못된 UUID 포맷의 reviewId를 사용해 호출 시에도 형식 에러 등 예외 발생을 검증
 * - 반환 데이터에 민감 정보나 예상치 못한 값이 포함되지 않는지도 간접 확인(명세상 상세 검증은 생략)
 *
 * [검증 시나리오]
 *
 * 1. 실존하지 않는 reviewId(UUID) 사용 시 정상적으로 error가 throw 되는지 테스트
 * 2. 형식이 잘못된 reviewId 문자열 사용 시에도 error가 throw 되는지 테스트
 */
export async function test_api_aimall_backend_seller_reviews_attachments_index_invalid_reviewId(
  connection: api.IConnection,
) {
  // 1. 실존하지 않는(무작위) reviewId(UUID)로 API 호출: 정상적으로 에러가 발생해야 함
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 리뷰 ID는 404 등 에러가 발생해야 함",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.index(
      connection,
      { reviewId: fakeReviewId },
    );
  });

  // 2. 형식이 잘못된 reviewId 값으로 호출: 타입/포맷 에러가 발생해야 함
  const invalidReviewId = "not-a-uuid-format";
  await TestValidator.error("리뷰 ID 포맷 오류 시에도 에러가 발생해야 함")(
    async () => {
      await api.functional.aimall_backend.seller.reviews.attachments.index(
        connection,
        { reviewId: invalidReviewId as string & tags.Format<"uuid"> },
      );
    },
  );
}
