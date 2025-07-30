import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 리뷰 첨부파일 업로드 정책 위반 시(지원되지 않는 파일 타입 또는 용량 초과) 서버에서 업로드를 거부하는지 검증
 *
 * - 리뷰를 하나 생성한 후, 실행파일(EXE) 업로드, 과도한 크기 파일 업로드 각각 시도
 * - 각 시도마다 서버가 정책 위반으로 인해 업로드를 거부하고, 에러가 발생하는지 검증
 * - 실패 후 리뷰에 첨부파일이 추가되지 않았는지는 별도 첨부파일 목록 엔드포인트가 없어 확인 생략
 */
export async function test_api_aimall_backend_customer_reviews_attachments_invalid_type_or_size(
  connection: api.IConnection,
) {
  // 1. 리뷰 생성 (사전조건)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "실패 시나리오 테스트용 리뷰",
        body: "리뷰 첨부파일 실패 테스트.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. [에러] 지원되지 않는 파일 형식(EXE) 첨부 시도 → 정책 위반 에러 발생해야 함
  await TestValidator.error("실행파일(EXE) 첨부는 거절되어야 함")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://test-bucket/malware.exe",
          file_type: "application/x-msdownload",
          file_size: 123456,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });

  // 3. [에러] 용량 초과(예: 20MB 파일) 첨부 시도 → 정책 위반 에러
  await TestValidator.error("첨부파일 용량 초과는 거절되어야 함")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://test-bucket/hugefile.jpg",
          file_type: "image/jpeg",
          file_size: 20 * 1024 * 1024, // 20MB
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });
  // 첨부파일 목록 확인 API 미제공으로, 리뷰에 첨부파일 미존재 후속 검증은 생략
}
