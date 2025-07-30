import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * 존재하지 않는 또는 이미 삭제된 스냅샷 ID로 삭제를 시도할 경우의 동작 검증
 *
 * 관리자 권한에서 존재하지 않는 snapshotId (혹은 이미 삭제되어 더 이상 존재하지 않는 snapshotId)에 대해 삭제 API를
 * 호출하면, 시스템은 반드시 404 Not Found 에러를 반환해야 하며, 클라이언트에게 내부 시스템 에러 정보가 노출되어서는 안
 * 됩니다.
 *
 * [테스트 순서]
 *
 * 1. 무작위(존재 가능성 없는) UUID를 snapshotId로 지정
 * 2. 해당 snapshotId로 삭제 API 호출 시도
 * 3. 404 Not Found 에러가 반환되는지 검증
 * 4. 에러 응답이 외부에 내부 동작 정보(상세 메시지 등)를 노출하지 않는지 확인 (단순 error 발생만 검증)
 */
export async function test_api_aimall_backend_administrator_snapshots_test_delete_snapshot_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않을 확률이 높은 랜덤 UUID 생성
  const nonexistentSnapshotId = typia.random<string & tags.Format<"uuid">>();

  // 2. 해당 snapshotId로 삭제 API 호출 → 404 not found 에러 발생 기대
  await TestValidator.error(
    "존재하지 않는 snapshotId 삭제 시 404 not found 반환",
  )(async () => {
    await api.functional.aimall_backend.administrator.snapshots.erase(
      connection,
      {
        snapshotId: nonexistentSnapshotId,
      },
    );
  });
}
