import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate error when attempting to create a review snapshot with an
 * invalid/nonexistent reviewId.
 *
 * This test ensures the system correctly returns an error (not found or
 * validation) when an administrator attempts to create a media snapshot for a
 * product review that does not exist in the system. It verifies that the
 * backend prevents orphaned snapshot creation and enforces data consistency.
 *
 * Steps:
 *
 * 1. Create an administrator account to authenticate the context.
 * 2. Attempt to create a snapshot for a randomly generated, certainly-nonexistent
 *    reviewId using the administrator context.
 * 3. Confirm that the API call returns a not found or validation error, and no
 *    snapshot is created for the non-existent review.
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_create_review_snapshot_as_admin_review_not_found(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성 (테스트 컨텍스트용)
  const adminInput = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>(),
    name: "관리자테스트",
    status: "active",
  } satisfies IAimallBackendAdministrator.ICreate;
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: adminInput },
    );
  typia.assert(admin);

  // 2. 존재하지 않는 reviewId로 스냅샷 등록 시도
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();
  const snapshotInput = {
    media_uri: "https://static.aimall.test/image.jpg",
    caption: "어드민 오류 테스트 스냅샷",
  } satisfies IAimallBackendSnapshot.ICreate;

  await TestValidator.error("not exists reviewId - should fail")(async () => {
    await api.functional.aimall_backend.administrator.reviews.snapshots.create(
      connection,
      {
        reviewId: invalidReviewId,
        body: snapshotInput,
      },
    );
  });
}
