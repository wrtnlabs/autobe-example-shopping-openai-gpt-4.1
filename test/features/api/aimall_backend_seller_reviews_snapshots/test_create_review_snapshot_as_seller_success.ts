import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 판매자 권한으로 상품리뷰의 스냅샷 이미지를 정상적으로 생성하는 사례의 End-to-End 검증.
 *
 * [비즈니스 시나리오 및 목적]
 *
 * - 새로운 판매자를 온보딩(가입/등록)한다.
 * - 해당 판매자 소유라고 가정되는 상품ID를 생성한다 (API 미제공, 임의값).
 * - 위 상품에 대해 고객 리뷰를 1건 등록한다 (리뷰 생성시 product_id 입력).
 * - 리뷰에 대해 판매자 권한으로 스냅샷(이미지 등) 등록 요청을 수행한다.
 * - 정상적으로 스냅샷이 생성되고, 입력값(media_uri, caption, product_id 등)이 응답 구조에 올바르게 저장되는지
 *   확인한다.
 *
 * [테스트 주요 단계]
 *
 * 1. 판매자 계정 등록(온보딩) 및 데이터 생성
 * 2. (상품 생성 API 부재로 product_id는 랜덤값 이용, seller 소유라 가정)
 * 3. 고객 리뷰 생성 (product_id 연동)
 * 4. 리뷰에 대한 스냅샷 생성 (reviewId로 연결, media_uri/caption 지정)
 * 5. 결과값 필드(media_uri, caption, product_id) 검증
 */
export async function test_api_aimall_backend_seller_reviews_snapshots_test_create_review_snapshot_as_seller_success(
  connection: api.IConnection,
) {
  // 1. 판매자 온보딩(가입)
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. 상품 ID 랜덤 발급(실제 상품 생성 API 없음, 판매자 상품이라 가정)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. 고객 리뷰 등록 (상품ID 지정)
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: productId,
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 4. 판매자 리뷰 스냅샷(이미지/미디어) 생성 요청
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    product_id: productId,
    media_uri: RandomGenerator.alphaNumeric(22),
    caption: RandomGenerator.paragraph()(1),
  };
  const snapshot =
    await api.functional.aimall_backend.seller.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 5. 필드별값 정상 저장여부 확인
  TestValidator.equals("media_uri matches")(snapshot.media_uri)(
    snapshotInput.media_uri,
  );
  TestValidator.equals("caption matches")(snapshot.caption)(
    snapshotInput.caption,
  );
  TestValidator.equals("product_id matches")(snapshot.product_id)(productId);
}
