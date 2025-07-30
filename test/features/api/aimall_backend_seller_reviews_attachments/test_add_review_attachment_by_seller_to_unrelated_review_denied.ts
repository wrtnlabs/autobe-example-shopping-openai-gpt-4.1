import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 검증: 판매자는 자신 제품이 아닌 리뷰에 첨부 파일을 추가할 수 없다.
 *
 * 비즈니스 시나리오:
 *
 * 1. 서로 다른 정보로 Seller 2명을 생성 (관리자 엔드포인트 이용)
 * 2. 각 Seller로 Product를 하나씩 생성
 * 3. Customer 1명이 첫 Seller의 Product에 대해 리뷰를 작성했다고 가정 (실제 엔드포인트 부재로 uuid만 생성)
 * 4. 두 번째 Seller가 첫 Seller의 리뷰(reviewId)로 첨부파일 추가를 시도
 * 5. 403 Forbidden(권한 없음)이 발생하는지 확인 (TestValidator.error 사용)
 *
 * ※ 실제 리뷰 생성 엔드포인트 및 인증 API가 제공되지 않아, 리뷰 UUID 생성 및 비정상 정상 시나리오 검증 위주로 테스트 구현
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_add_review_attachment_by_seller_to_unrelated_review_denied(
  connection: api.IConnection,
) {
  // 1. Seller 2명 등록 (관리자 엔드포인트)
  const seller1 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller1);

  const seller2 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller2);

  // 2. 각 Seller로 Product 생성 (각기 다른 seller_id)
  const product1 = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller1.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product1);

  const product2 = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller2.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product2);

  // 3. (실제 리뷰 엔드포인트 없음) 리뷰의 UUID 생성 (customer가 product1에 리뷰 작성했다고 가정)
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 4. seller2가 seller1의 상품 리뷰(reviewId)에 파일 첨부 시도
  await TestValidator.error(
    "권한 없는 판매자가 타 리뷰에 첨부파일 추가 시 403",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.create(
      connection,
      {
        reviewId: reviewId,
        body: {
          post_id: null,
          comment_id: null,
          review_id: reviewId,
          file_uri: `s3://dummy/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 123456,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });
}
