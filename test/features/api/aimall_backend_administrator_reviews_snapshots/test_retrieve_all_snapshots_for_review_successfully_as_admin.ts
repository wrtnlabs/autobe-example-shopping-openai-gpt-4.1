import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 관리자 권한으로 특정 리뷰(reviewId)에 연결된 모든 스냅샷(medias)을 정상적으로 조회하는 플로우를 검증합니다.
 *
 * 1. 신규 고객을 등록합니다 (고객 계정 생성).
 * 2. 고객으로 상품 리뷰를 작성합니다.
 * 3. 관리자 권한으로, 해당 리뷰에 스냅샷(사진/미디어)들을 여러 개 등록합니다.
 * 4. 관리자 권한으로 리뷰에 연결된 스냅샷 목록을 조회합니다.
 * 5. 응답에 등록한 스냅샷들이 모두 포함되어 있고, 각 스냅샷이 스키마상 필수 필드를 정상적으로 포함하는지 검증합니다.
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_index_test_retrieve_all_snapshots_for_review_successfully_as_admin(
  connection: api.IConnection,
) {
  // 1. 신규 고객을 등록합니다.
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
      },
    });
  typia.assert(customer);

  // 2. 고객으로서 상품 리뷰를 등록합니다. (임의 product_id 사용)
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "관리자 스냅샷 테스트",
        body: "스냅샷 API E2E 테스트 시나리오.",
        rating: 5,
      },
    });
  typia.assert(review);

  // 3. 관리자 권한으로 해당 리뷰에 여러 스냅샷 등록
  const snapshots: IAimallBackendSnapshot[] = [];
  for (let i = 0; i < 3; ++i) {
    const snapshot =
      await api.functional.aimall_backend.administrator.reviews.snapshots.create(
        connection,
        {
          reviewId: review.id,
          body: {
            media_uri: `https://cdn.example.com/image/test-${i + 1}.jpg`,
            caption: `테스트 이미지 #${i + 1}`,
            created_at: new Date().toISOString(),
          },
        },
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }

  // 4. 스냅샷 전체 목록 조회 (관리자 권한)
  const page =
    await api.functional.aimall_backend.administrator.reviews.snapshots.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(page);

  // 5. 응답 검증: 등록한 스냅샷이 모두 포함됐는지, 필드가 정상적으로 존재하는지 체크
  // (id, media_uri, created_at 등 필수스키마 검사)
  TestValidator.equals("스냅샷 개수 일치")(page.data?.length)(snapshots.length);
  snapshots.forEach((item) => {
    const found = page.data?.find((s) => s.id === item.id);
    TestValidator.predicate(`스냅샷(id=${item.id}) 존재 여부`)(!!found);
    TestValidator.equals("이미지 위치 일치")(found?.media_uri)(item.media_uri);
    TestValidator.equals("등록일시 일치")(found?.created_at)(item.created_at);
  });
}
