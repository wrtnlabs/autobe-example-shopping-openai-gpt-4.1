import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 인증되지 않은(비관리자) 사용자가 관리자 스냅샷 목록 조회 시 접근 거부를 확인합니다.
 *
 * 이 테스트는 RBAC(역할 기반 접근제어)가 민감 미디어(스냅샷) 기록에 잘 적용되어 있는지 검증합니다.
 *
 * 1. (전제: 비관리자 계정/연결 사용) 별도 로그인/권한 부여 없는 커넥션 객체를 준비합니다.
 * 2. 커넥션 객체로 GET /aimall-backend/administrator/snapshots 호출을 시도합니다.
 * 3. Authorization/forbidden 관련 오류가 발생하는지 검증합니다.
 */
export async function test_api_aimall_backend_administrator_snapshots_test_list_snapshots_as_non_admin_is_forbidden(
  connection: api.IConnection,
) {
  // 1. 비관리자(권한 없는) 커넥션으로 호출 시도
  // 2. 접근 거부(Authorization Error) 발생 여부 확인
  await TestValidator.error("비관리자 접근 거부 오류 검증")(async () => {
    await api.functional.aimall_backend.administrator.snapshots.index(
      connection,
    );
  });
}
