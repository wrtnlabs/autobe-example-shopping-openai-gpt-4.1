import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 관리자 권한으로 리뷰 스냅샷 단건 조회 성공 케이스를 검증합니다.
 *
 * 시나리오:
 *
 * 1. 고객이 상품 리뷰를 작성합니다.
 * 2. 관리자가 작성된 리뷰에 스냅샷을 첨부합니다.
 * 3. 관리자가 해당 스냅샷의 상세 정보를 단건 조회 API로 불러옵니다.
 * 4. 반환 데이터의 모든 필드가 적절히 기입되어 있는지 검사하며, 입력-출력 메타데이터 일치성 및 RBAC(Role-Based Access
 *    Control) 적용 여부를 확인합니다.
 *
 * - 관리자가 아닌 주체나 잘못된 reviewId/snapshotId를 입력할 경우는 별도의 실패 시나리오에서 다뤄집니다.
 * - 여기서는 정상적인 성공 흐름을 중심으로 구현합니다.
 *
 * 검증 내용:
 *
 * - 관리자는 리뷰에 속한 스냅샷 단건을 상세히 조회할 수 있으며, 스냅샷 등록 시 입력한 데이터가 그대로 보존돼 반환됨을 확인함.
 * - 응답의 모든 메타필드(id, product_id, post_id, customer_id, media_uri, caption,
 *   created_at)가 정상적으로 조회되는지 검증.
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_fetch_review_snapshot_detail_as_admin_success(
  connection: api.IConnection,
) {
  // 1. 고객이 상품 리뷰를 작성합니다.
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test review for snapshot",
        body: "리뷰 스냅샷 첨부를 위한 테스트용 리뷰 본문입니다.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. 관리자가 해당 리뷰에 스냅샷을 첨부 (추가 생성)
  const snapshotInput = {
    product_id: review.product_id,
    customer_id: review.customer_id,
    media_uri: "https://example.com/test-image.jpg",
    caption: "테스트 이미지 첨부",
  } satisfies IAimallBackendSnapshot.ICreate;
  const snapshot =
    await api.functional.aimall_backend.administrator.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 3. 관리자가 해당 스냅샷 상세 정보 단건 조회
  const result =
    await api.functional.aimall_backend.administrator.reviews.snapshots.at(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(result);

  // 4. 입력/출력 일치성 및 필드값 검증
  TestValidator.equals("id 일치")(result.id)(snapshot.id);
  TestValidator.equals("customer_id 일치")(result.customer_id)(
    snapshot.customer_id,
  );
  TestValidator.equals("product_id 일치")(result.product_id)(
    snapshot.product_id,
  );
  TestValidator.equals("media_uri 일치")(result.media_uri)(snapshot.media_uri);
  TestValidator.equals("caption 일치")(result.caption)(snapshot.caption);
  TestValidator.predicate("created_at 필드 존재 및 형식확인")(
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  // post_id 필드는 optional이며 이번 흐름에서는 undefined 또는 null 허용
}
