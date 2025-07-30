import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 존재하지 않는 reviewId로 상품 리뷰 첨부파일 리스트 조회 시 에러 검증
 *
 * - 존재하지 않거나 임의로 생성된 UUID를 reviewId로 첨부파일 조회 API를 호출하면 데이터가 유출되거나 반환되지 않아야 하며,
 *   반드시 404 또는 적절한 에러가 발생해야 한다.
 * - 잘못된 reviewId 입력이 있을 때 검증/보안 측면에서 데이터 노출이 없는지 확인하는 목적.
 *
 * [테스트 절차]
 *
 * 1. Typia.random<string & tags.Format<"uuid">>()로 실제 존재하지 않는 reviewId 생성
 * 2. API 호출: api.functional.aimall_backend.customer.reviews.attachments.index
 * 3. 정상 케이스에서 에러가 발생하지 않고 data가 반환되면, data가 비어 있지 않은 경우 테스트 실패로 간주
 * 4. 반드시 HttpError(404 not found 등)가 발생하거나, data 노출이 없어야 한다
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_list_review_attachments_with_invalid_review_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 reviewId(uuid) 생성
  const invalidReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. 에러 발생 및 데이터 노출 방지 검증
  await TestValidator.error(
    "존재하지 않는 reviewId 조회시 반드시 에러 또는 빈 결과만 반환",
  )(async () => {
    const result =
      await api.functional.aimall_backend.customer.reviews.attachments.index(
        connection,
        { reviewId: invalidReviewId },
      );
    typia.assert(result);
    if (result.data && result.data.length > 0) {
      throw new Error(
        "잘못된 reviewId에 대해 첨부파일 데이터가 노출됨: 보안 결함",
      );
    }
  });
}
