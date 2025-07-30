import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 고객이 존재하지 않는 리뷰에 스냅샷(미디어)을 등록하려 할 때 오류 응답을 검증합니다.
 *
 * 이 테스트는 정상적으로 회원가입만 완료된 고객이 실제로 존재하지 않거나 삭제된 reviewId에 대해 스냅샷 생성 요청을 할 경우, 서버가
 * 404 Not Found 또는 유효성 오류 등의 정상적인 실패 응답을 반환하는지 검증합니다. 실제로는 임의의 랜덤
 * UUID(reviewId)를 사용하여 존재하지 않는 리뷰로 처리하도록 시도합니다.
 *
 * [절차]
 *
 * 1. 신규 고객 회원가입 (정상적인 필수 필드로 가입)
 * 2. 존재하지 않는 reviewId(UUID) 준비
 * 3. 해당 reviewId로 스냅샷 생성(등록) 시도
 * 4. 오류(예: 404, Not Found, validation 등) 발생 여부 검증
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_create_review_snapshot_for_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. 신규 고객 회원가입
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. 존재하지 않는 reviewId(UUID) 준비
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. 임의 reviewId로 스냅샷 생성 시도 - 실패해야 정상
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    media_uri: "https://example.com/nonexistent.jpg",
  };
  await TestValidator.error("Non-existent reviewId should trigger an error")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.snapshots.create(
        connection,
        {
          reviewId: nonExistentReviewId,
          body: snapshotInput,
        },
      );
    },
  );
}
