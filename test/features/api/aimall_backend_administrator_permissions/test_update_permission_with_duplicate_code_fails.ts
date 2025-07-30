import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * 관리자 RBAC 권한(퍼미션) 엔티티의 코드(이름)를, 이미 존재하는 다른 권한의 코드와 중복되는 값으로 변경하려고 시도할 때,
 * 고유성(uniqueness) 제약 조건을 위반하는 상황에서 적절한 오류 응답이 반환되는지 검증합니다.
 *
 * 비즈니스 배경:
 *
 * - 운영자 RBAC 권한/롤 시스템에서 각 권한의 name(code)은 시스템 전체에서 유일해야 하며, 중복 코드가 입력될 경우 생성이나
 *   수정이 거부되어야 합니다.
 *
 * 검증 대상:
 *
 * - /aimall-backend/administrator/permissions/{permissionId} (PUT) 엔드포인트의 입력값 유효성
 *   및 제약 조건 위반 처리
 * - 이미 존재하는 코드로 업데이트 시 적절한 오류 반환
 *
 * 테스트 절차:
 *
 * 1. 첫 번째 RBAC 권한(permission) 엔티티를 고유한 코드로 생성합니다.
 * 2. 두 번째 RBAC 권한(permission) 엔티티를 다른 고유 코드로 생성합니다.
 * 3. 두 번째 권한의 permissionId를 대상으로, 첫 번째 권한의 name(code) 값으로 변경하는 업데이트 요청을 시도합니다.
 * 4. 업데이트 요청이 고유성 위반으로 실패해야 하며, 오류가 반환되는지 TestValidator.error로 검증합니다.
 */
export async function test_api_aimall_backend_administrator_permissions_test_update_permission_with_duplicate_code_fails(
  connection: api.IConnection,
) {
  // 1. 첫 번째 RBAC 권한(퍼미션) 생성
  const uniqueName1 = `role_${RandomGenerator.alphaNumeric(8)}`;
  const permission1 =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      {
        body: {
          name: uniqueName1,
          display_name: "테스트 권한 1",
          description: "중복 테스트용 첫 번째 RBAC 권한.",
        } satisfies IAimallBackendPermission.ICreate,
      },
    );
  typia.assert(permission1);

  // 2. 두 번째 RBAC 권한(퍼미션) 생성
  const uniqueName2 = `role_${RandomGenerator.alphaNumeric(8)}`;
  const permission2 =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      {
        body: {
          name: uniqueName2,
          display_name: "테스트 권한 2",
          description: "중복 테스트용 두 번째 RBAC 권한.",
        } satisfies IAimallBackendPermission.ICreate,
      },
    );
  typia.assert(permission2);

  // 3. 두 번째 퍼미션의 코드(name)를 첫 번째 퍼미션의 값으로 변경 요청 (즉, 중복값으로 update)
  await TestValidator.error("퍼미션 name 중복 업데이트 방지 작동 확인")(
    async () => {
      await api.functional.aimall_backend.administrator.permissions.update(
        connection,
        {
          permissionId: permission2.id,
          body: {
            name: permission1.name, // <- 중복 코드로 업데이트 시도
          } satisfies IAimallBackendPermission.IUpdate,
        },
      );
    },
  );
}
