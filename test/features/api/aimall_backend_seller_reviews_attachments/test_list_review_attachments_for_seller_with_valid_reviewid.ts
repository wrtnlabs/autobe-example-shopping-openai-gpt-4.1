import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 판매자가 유효한 reviewId로 해당 리뷰의 첨부파일 전체를 정상적으로 조회할 수 있음을 검증.
 *
 * 비즈니스 컨텍스트: 판매자는 자신의 상품에 작성된 리뷰의 첨부파일 전체 목록을 확인/검수할 수 있어야 하며, 이를 위해 상품
 * 생성(판매자), 리뷰 생성(고객), 첨부 업로드(고객), 첨부파일 다수 등록 및 목록 조회까지의 end-to-end 플로우를 점검한다.
 *
 * [테스트 워크플로우]
 *
 * 1. (판매자 인증 상태) 상품 1개 생성
 * 2. (고객 인증 상태) 생성된 상품에 대해 리뷰 1개 작성
 * 3. (고객) 리뷰에 첨부파일 3개 업로드
 * 4. (판매자 인증 컨텍스트) 해당 reviewId 기준 첨부파일 전체 목록 API를 호출하여 데이터 검증
 * 5. 응답된 모든 첨부파일의 id, file_uri, type, size 등이 업로드된 객체와 정확히 매치되는지 확인
 *
 * 본 테스트는 연결된 인증 컨텍스트 전환 및 권한부여가 되었다고 가정하며, 실제 connection 토큰 관리 코드는 요구되지 않음
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_list_review_attachments_for_seller_with_valid_reviewid(
  connection: api.IConnection,
) {
  // 1. (판매자 인증 상태) 상품 생성
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(2),
    description: RandomGenerator.content()(1)(1),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: productInput,
    },
  );
  typia.assert(product);

  // 2. (고객 인증 상태) 리뷰 생성
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()(1)(1),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewInput,
    },
  );
  typia.assert(review);

  // 3. (고객) 리뷰에 첨부파일 3개 업로드
  const attachments: IAimallBackendAttachment[] = [];
  for (let i = 0; i < 3; ++i) {
    const attachmentInput: IAimallBackendAttachment.ICreate = {
      review_id: review.id,
      file_uri: `s3://bucket/review/${review.id}/file-${i}.jpg`,
      file_type: "image/jpeg",
      file_size: typia.random<number & tags.Type<"int32">>() + 100 * i,
      post_id: undefined,
      comment_id: undefined,
    };
    const uploaded =
      await api.functional.aimall_backend.customer.reviews.attachments.create(
        connection,
        {
          reviewId: review.id,
          body: attachmentInput,
        },
      );
    typia.assert(uploaded);
    attachments.push(uploaded);
  }

  // 4. (판매자 인증 컨텍스트) 첨부파일 전체 목록 조회
  const page =
    await api.functional.aimall_backend.seller.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(page);
  TestValidator.equals("attachments count")(page.data?.length ?? 0)(
    attachments.length,
  );

  // 5. 모든 첨부파일 id, URI, type, size가 업로드 객체와 정확히 일치하는지 확인
  const attachmentIdSet = new Set(attachments.map((att) => att.id));
  for (const summary of page.data ?? []) {
    if (summary.id) {
      TestValidator.predicate("returned id in uploaded attachments")(
        attachmentIdSet.has(summary.id),
      );
    }
    if (summary.file_uri) {
      const match = attachments.find(
        (att) => att.file_uri === summary.file_uri,
      );
      TestValidator.predicate("attachment file_uri match")(!!match);
      if (match) {
        TestValidator.equals("file_type")(summary.file_type)(match.file_type);
        TestValidator.equals("file_size")(summary.file_size)(match.file_size);
      }
    }
  }
}
