import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 인증된 고객이 본인의 상품 리뷰에 첨부한 스냅샷(사진/미디어) 리스트 전체 조회에 성공하는지 검증합니다.
 *
 * 본 테스트는 다음의 실제 비즈니스 플로우를 검증합니다:
 *
 * 1. 고객이 임의 상품에 리뷰를 1건 작성(등록)
 * 2. 해당 리뷰에 사진/미디어 스냅샷을 여러 건 첨부(등록)
 * 3. 리뷰의 스냅샷 전체 리스트를 API로 조회(페이징 결과)
 * 4. 반환된 데이터가 모두 해당 리뷰에 연결된 건인지 확인
 * 5. 필요시 페이징/메타 필드와 등록 건들과의 일치성 검증
 * 6. 논리적으로 부적절(타 리뷰/비공개 등)이거나 누락된 건이 없는지도 최소 검증
 *
 * [비고] 테스트 목적상 추가 권한/비공개 필드 검증, 타권한 필터링은 별도 API/권한이 없으므로 최소 불변 검증에 한함
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_index(
  connection: api.IConnection,
) {
  // 1. 임의 상품에 대한 리뷰 데이터 생성
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "E2E Test Review - " + RandomGenerator.alphabets(8),
        body: "리뷰 시나리오 자동화 테스트용 본문입니다.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. 해당 리뷰에 스냅샷 여러 개 첨부(등록)
  const attachedSnapshots = await ArrayUtil.asyncRepeat(3)(async () => {
    const snapshot =
      await api.functional.aimall_backend.customer.reviews.snapshots.create(
        connection,
        {
          reviewId: review.id,
          body: {
            media_uri:
              "https://e2e-snapshot/" + RandomGenerator.alphaNumeric(16),
            caption:
              "스냅샷 자동생성 테스트 설명: " + RandomGenerator.paragraph()(10),
          } satisfies IAimallBackendSnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
    return snapshot;
  });

  // 3. 방금 등록한 리뷰 id 기준 스냅샷 전체 리스트 조회
  const output =
    await api.functional.aimall_backend.customer.reviews.snapshots.index(
      connection,
      { reviewId: review.id },
    );
  typia.assert(output);

  // 4. 반환 데이터 전부 reviewId에 연결된 건인지 확인
  TestValidator.predicate("all snapshots for reviewId")(
    !!output.data &&
      output.data.every(
        (snap) => snap.post_id === undefined || snap.post_id === null,
      ),
  );

  // 5. 페이징 메타 등 검사 및 실제 등록 건 포함성 확인
  if (output.pagination) {
    TestValidator.predicate("pagination meta valid")(
      output.pagination.current >= 1 &&
        output.pagination.limit >= 1 &&
        output.pagination.records >= attachedSnapshots.length,
    );
  }

  // 실제 등록한 스냅샷 모두 응답 데이터 내 포함 여부 확인
  const receivedIds = new Set(output.data?.map((s) => s.id));
  for (const snap of attachedSnapshots) {
    TestValidator.predicate("snapshot listed")(receivedIds.has(snap.id));
  }
}
