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
 * Validate seller review attachment creation
 *
 * 이 테스트는 셀러가 자신의 상품에 등록된 고객 리뷰에 첨부파일(예: 이미지, PDF 등)을 정상적으로 추가할 수 있음을 검증합니다.
 *
 * 절차:
 *
 * 1. 관리자가 셀러를 등록한다.
 * 2. 해당 셀러가 상품을 등록한다.
 * 3. 고객을 한 명 가입시킨다.
 * 4. 고객이 방금 등록한 상품에 리뷰를 작성한다.
 * 5. 셀러가 이 리뷰에 첨부파일(이미지, PDF 등)을 추가한다.
 * 6. 응답이 타입에 맞고 review_id, file 속성이 모두 기대대로 연결되었는지 확인한다.
 * 7. 감사 로그 등 외부 시스템 검증은 생략하고, created_at 등 snapshot만 검증한다.
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_add_review_attachment_by_seller_success(
  connection: api.IConnection,
) {
  // 1. 관리자가 셀러를 등록한다.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. 셀러가 상품을 등록한다.
  const categoryId = typia.random<string & tags.Format<"uuid">>(); // 카테고리 생성 API가 없으므로 임의 생성
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: "s3://bucket/path/image.jpg",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("상품 셀러 연결")(product.seller_id)(seller.id);
  TestValidator.equals("상품 카테고리 연결")(product.category_id)(categoryId);

  // 3. 고객을 등록한다.
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. 고객이 상품에 대해 리뷰를 작성한다.
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);
  TestValidator.equals("리뷰 상품 연결")(review.product_id)(product.id);

  // 5. 셀러가 이 리뷰에 첨부파일을 추가한다.
  const fileTypes = ["image/jpeg", "image/png", "application/pdf"];
  const pickedFileType = RandomGenerator.pick(fileTypes);
  const fileUri = `s3://attachments/${typia.random<string & tags.Format<"uuid">>()}.${pickedFileType.split("/")[1]}`;
  const attachment: IAimallBackendAttachment =
    await api.functional.aimall_backend.seller.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: fileUri,
          file_type: pickedFileType,
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          post_id: null,
          comment_id: null,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 6. 응답 속성 및 연관관계 검증
  TestValidator.equals("첨부파일-리뷰 연결")(attachment.review_id)(review.id);
  TestValidator.equals("첨부파일 file_uri")(attachment.file_uri)(fileUri);
  TestValidator.equals("첨부파일 file_type")(attachment.file_type)(
    pickedFileType,
  );
  TestValidator.predicate("첨부파일 file_size 양수")(attachment.file_size > 0);
  TestValidator.predicate("첨부파일 created_at 값 체크")(
    !!attachment.created_at && attachment.created_at.length > 0,
  );
}
