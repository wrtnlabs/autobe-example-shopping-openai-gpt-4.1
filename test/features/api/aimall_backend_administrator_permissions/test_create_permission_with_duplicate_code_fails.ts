import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * RBAC 권한(퍼미션)/역할 코드 중복 생성 거부 검증
 *
 * AIMall 백엔드의 RBAC(역할 기반 접근제어) 시스템은 모든 권한/역할의 code(name)가 반드시 전역에서 유일해야 합니다. 중복
 * 코드로 생성이 가능하면 관리 혼란, 역할 충돌, 권한 부여 오류, 보안 취약점이 초래될 수 있으므로, API 레벨에서 반드시 name 중복
 * 체크가 이뤄져야 합니다.
 *
 * 본 테스트의 목적은 code(=name)가 이미 존재할 경우 새 권한/역할 생성 요청을 시스템이 거부(충돌/유효성 오류 발생)하는지
 * 검증하는 것입니다.
 *
 * [테스트 시나리오]
 *
 * 1. 고유한 name(code)로 RBAC permission 생성
 * 2. 같은 code(name)로 display_name/description만 다르게 하여 한 번 더 생성 시도
 * 3. 두 번째 생성은 반드시 reject(에러 반환)되어야 함
 *
 * 전사 RBAC 정책의 안정성과 실무 관리 신뢰도를 보장합니다.
 */
export async function test_api_aimall_backend_administrator_permissions_test_create_permission_with_duplicate_code_fails(
  connection: api.IConnection,
) {
  // 1. 고유 코드로 권한/역할 신규 생성
  const uniqueCode = `role_code_${Math.random().toString(36).substring(2, 10)}`;
  const createInput = {
    name: uniqueCode,
    display_name: "테스트 권한(중복확인)",
    description: "이 권한은 중복 테스트를 위해 생성된 테스트용 권한입니다.",
  } satisfies IAimallBackendPermission.ICreate;
  const permission =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      { body: createInput },
    );
  typia.assert(permission);
  TestValidator.equals("permission.name matches input")(permission.name)(
    uniqueCode,
  );

  // 2. 동일 code(name)으로 다시 생성 → 실패(Expected: error)
  const duplicateInput = {
    name: uniqueCode, // intentionally duplicated code
    display_name: "다른 표시 이름",
    description: "중복 생성 재현용 설명.",
  } satisfies IAimallBackendPermission.ICreate;
  await TestValidator.error("code(name) 중복 생성시 오류 반환")(async () => {
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      { body: duplicateInput },
    );
  });
}
