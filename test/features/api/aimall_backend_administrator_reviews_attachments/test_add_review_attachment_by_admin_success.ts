import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 관리자 권한으로 상품 리뷰에 첨부파일 추가 기능을 검증합니다.
 *
 * - 판매자 계정 생성 (최소 required 필드)
 * - 해당 판매자가 상품 등록 (category_id는 UUID 랜덤)
 * - 고객 회원 가입
 * - 고객이 상품에 대한 리뷰 작성
 * - 관리자가 해당 리뷰에 파일 첨부(첨부파일 엔티티 연관성 및 메타데이터 검증)
 *
 * 검증 포인트:
 *
 * - 반환된 첨부파일의 review_id가 대상 리뷰와 일치하는지
 * - Post_id, comment_id는 null임을 확인(잘못된 엔티티 연결 방지)
 * - File_uri, file_type, file_size, created_at 등 메타데이터
 *
 * Steps:
 *
 * 1. 판매자 생성 (IAimallBackendSeller.ICreate)
 * 2. 상품 등록 (IAimallBackendProduct.ICreate)
 * 3. 고객 생성 (IAimallBackendCustomer.ICreate)
 * 4. 리뷰 생성 (IAimallBackendReview.ICreate)
 * 5. 관리자가 첨부파일 등록
 * 6. 첨부파일의 반환값 및 메타 정보/연관성 종합 검증
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_add_review_attachment_by_admin_success(
  connection: api.IConnection,
) {
  // 1. 판매자 생성
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. 상품 등록 (해당 판매자)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. 고객 회원가입
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: "hashed_password_example",
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 4. 리뷰 작성 (고객 → 해당 상품)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 5. 관리자가 리뷰에 첨부파일 등록
  const fileUri = `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const fileType = "image/jpeg";
  const fileSize = 60102;
  const attachment =
    await api.functional.aimall_backend.administrator.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          post_id: null,
          comment_id: null,
          review_id: review.id,
          file_uri: fileUri,
          file_type: fileType,
          file_size: fileSize,
        },
      },
    );
  typia.assert(attachment);

  // 6. 첨부파일 반환값 필드 및 연관성 검증
  TestValidator.equals("review_id 일치")(attachment.review_id)(review.id);
  TestValidator.equals("post_id는 null")(attachment.post_id)(null);
  TestValidator.equals("comment_id는 null")(attachment.comment_id)(null);
  TestValidator.equals("file_uri 일치")(attachment.file_uri)(fileUri);
  TestValidator.equals("file_type 일치")(attachment.file_type)(fileType);
  TestValidator.equals("file_size 일치")(attachment.file_size)(fileSize);
  TestValidator.predicate("created_at 필수 문자열")(
    typeof attachment.created_at === "string" &&
      attachment.created_at.length > 0,
  );
}
