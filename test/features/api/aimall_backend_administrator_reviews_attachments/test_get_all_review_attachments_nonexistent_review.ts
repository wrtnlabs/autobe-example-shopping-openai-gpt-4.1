import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 테스트: 존재하지 않는 reviewId에 대해 관리자 권한으로 첨부파일 목록 조회 시 404 에러 발생 여부를 검증합니다.
 *
 * 이 테스트는 관리자가 유효하지 않거나 존재하지 않는 reviewId로 첨부파일 목록 API를 조회할 경우, 시스템이 'not
 * found'(404) 에러를 반환하는지 확인합니다. 이를 통해 무효한 리뷰 ID에 대해 보안적으로 적절한 처리가 되고, 민감 정보가
 * 노출되지 않음을 보장합니다.
 *
 * [테스트 과정]
 *
 * 1. 존재하지 않을 확률이 매우 높은 랜덤 UUID(fakerReviewId)를 생성합니다.
 * 2. 해당 UUID를 reviewId로 하여 첨부파일 목록 조회 API를 호출합니다.
 * 3. 반드시 404(Not Found) 에러가 발생함을 검증합니다.
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_get_all_review_attachments_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 reviewId를 랜덤 UUID로 준비합니다.
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2, 3. 첨부파일 목록 조회 시 404 에러가 발생하는지 검증합니다.
  await TestValidator.error(
    "존재하지 않는 reviewId의 첨부파일 목록 조회는 404 에러가 발생해야 함",
  )(async () => {
    await api.functional.aimall_backend.administrator.reviews.attachments.index(
      connection,
      {
        reviewId: fakeReviewId,
      },
    );
  });
}
