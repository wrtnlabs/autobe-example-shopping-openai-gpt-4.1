import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * 검증: 관리자 권한으로 모든 RBAC 권한/역할 정의 목록을 정상적으로 조회할 수 있는지 테스트합니다. 또한 반환된 각 permission
 * 객체가 스키마(코드, 노출명, 설명 등)대로 정확히 구성되어 있고, 허용되지 않은 민감 정보가 포함되지 않는 것도 확인합니다.
 *
 * 1. (필요 시) 관리자 인증 정보를 세팅합니다.
 * 2. 전체 권한/역할 정의 목록을 조회합니다.
 * 3. 반환된 각 permission이 ISummary DTO 스키마(코드, display_name, description, id,
 *    created_at)만 포함하는지 확인하고, 추가 필드가 없는지 검증합니다.
 * 4. 필요한 경우 각 필드가 null/undefined가 아닌지, 포맷이 적합한지(예: id는 uuid, created_at은
 *    date-time) 검사합니다.
 */
export async function test_api_aimall_backend_administrator_permissions_index(
  connection: api.IConnection,
) {
  // 1. (준비) 관리자 역할을 가진 connection 사용 (필요 시 로그인/토큰 발급 선행)

  // 2. 권한/역할 전체 목록 조회 API 호출
  const permissions: IAimallBackendPermission.ISummary =
    await api.functional.aimall_backend.administrator.permissions.index(
      connection,
    );
  typia.assert(permissions);

  // 3. object가 ISummary의 스키마 필드 외의 속성을 포함하는지 확인
  const allowedKeys = [
    "id",
    "name",
    "display_name",
    "description",
    "created_at",
  ];
  for (const key of Object.keys(permissions)) {
    TestValidator.predicate(`허용되지 않은 필드가 존재하지 않아야 함: ${key}`)(
      allowedKeys.includes(key),
    );
  }

  // 4. 각 필드 타입/포맷 유효성 및 null/undefined 아님 검증
  TestValidator.predicate("id는 uuid 형식이어야 함")(
    /^[0-9a-fA-F-]{36}$/.test(permissions.id),
  );
  TestValidator.predicate("name은 비어있지 않아야 함")(
    typeof permissions.name === "string" && permissions.name.length > 0,
  );
  TestValidator.predicate("display_name은 비어있지 않아야 함")(
    typeof permissions.display_name === "string" &&
      permissions.display_name.length > 0,
  );
  TestValidator.predicate("description은 string 형태")(
    typeof permissions.description === "string",
  );
  TestValidator.predicate("created_at은 ISO date-time 형식이어야 함")(
    typeof permissions.created_at === "string" &&
      !Number.isNaN(Date.parse(permissions.created_at)),
  );
}
