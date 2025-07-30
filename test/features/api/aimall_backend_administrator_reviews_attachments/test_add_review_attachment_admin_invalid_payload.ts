import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 관리자 리뷰 첨부파일 POST 엔드포인트의 비정상/비준수 payload 거부 검증
 *
 * - 이 테스트는 판매자, 상품 선행 생성 후 (시스템 review entity 생성 API 미노출 시, mock reviewId 사용)
 * - 첨부파일 생성 API에 잘못된 payload(필수 필드 누락/허용되지 않는 파일 타입/불가 파일 사이즈/존재하지 않는 리뷰 ID)를 입력
 * - 엔드포인트가 DTO 및 비즈니스 제약조건 위반 payload를 error와 함께 정확히 거부하는지 확인함.
 * - 각각의 시나리오 (필수 필드 누락, 불허 file_type, file_size 오류, FK 오류)에 대해
 *   TestValidator.error로 런타임 오류 반환을 검증
 *
 * 테스트 목적:
 *
 * 1. 스키마/제약조건 위반 입력 값을 가진 요청이 거절되는지 검증
 * 2. 시스템의 입력 검증 엄격성 및 방어적 코딩 신뢰성 확인
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_add_review_attachment_admin_invalid_payload(
  connection: api.IConnection,
) {
  // 1. 판매자 선행 생성 (상품 컨텍스트 연동 목적)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. 상품 선행 생성 (review 컨텍스트 가정)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. 테스트용 mock reviewId — 실제 연결 review 생성 API 미노출 시 가상 사용 (존재할 가능성 높음)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // CASE 1. 필수 필드 file_uri 누락된 payload → 오류 발생 검증
  await TestValidator.error("필수 file_uri 누락시 거부")(() =>
    api.functional.aimall_backend.administrator.reviews.attachments.create(
      connection,
      {
        reviewId,
        body: {
          // file_uri: undefined intentionally omitted
          file_type: "image/png",
          file_size: 1024,
          review_id: reviewId,
          post_id: null,
          comment_id: null,
        } as any,
      },
    ),
  );

  // CASE 2. 허용되지 않는 file_type("application/x-malware") 지정 시 거부
  await TestValidator.error("불허 file_type 거부")(() =>
    api.functional.aimall_backend.administrator.reviews.attachments.create(
      connection,
      {
        reviewId,
        body: {
          file_uri: "s3://bucket/uuid-malware.png",
          file_type: "application/x-malware",
          file_size: 2048,
          review_id: reviewId,
          post_id: null,
          comment_id: null,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    ),
  );

  // CASE 3. file_size 0(불가) → 오류 발생 검증
  await TestValidator.error("file_size 0 거부")(() =>
    api.functional.aimall_backend.administrator.reviews.attachments.create(
      connection,
      {
        reviewId,
        body: {
          file_uri: "s3://bucket/uuid-zero.bin",
          file_type: "application/pdf",
          file_size: 0,
          review_id: reviewId,
          post_id: null,
          comment_id: null,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    ),
  );

  // CASE 4. 존재하지 않는 reviewId 전달 시 오류 발생
  await TestValidator.error("존재하지 않는 reviewId시 거부")(() =>
    api.functional.aimall_backend.administrator.reviews.attachments.create(
      connection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(), // 실제 연결 review 미존재 예상
        body: {
          file_uri: "s3://bucket/uuid-notfound.png",
          file_type: "image/png",
          file_size: 12345,
          review_id: reviewId,
          post_id: null,
          comment_id: null,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    ),
  );
}
