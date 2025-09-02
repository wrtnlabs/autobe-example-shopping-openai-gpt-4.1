import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_system_config_delete_nonexistent_failure(
  connection: api.IConnection,
) {
  /**
   * 존재하지 않는 시스템 설정(configId) 삭제 실패 검증.
   *
   * 1. 관리자로 가입(Join) 후 인증.
   * 2. 임의의 UUID로 존재하지 않는 configId 지정.
   * 3. 해당 configId로 시스템 설정 삭제 시도 → 404 또는 비즈니스 에러 발생해야 함.
   *
   * 삭제 시도에 대한 감사(audit) 로그 검증은 별도 시스템 내외부 절차가 필요해 자동화 테스트에서는 제외한다.
   */

  // 1. 관리자로 가입 및 인증
  const adminUsername: string = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@testdomain.com`;
  const adminName: string = RandomGenerator.name();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(16); // 실제 backend에서 해시 사용, 랜덤 문자열 대입
  const adminJoinPayload = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: adminName,
    email: adminEmail,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuth);

  // 2. 실존하지 않는(테스트 내에서 생성/삭제된 적 없는) configId 생성
  const nonexistentConfigId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. 존재하지 않는 시스템 설정 삭제 시도 → 에러 발생 검증
  await TestValidator.error(
    "존재하지 않는 시스템 설정을 삭제하면 404 또는 비즈니스 에러가 발생해야 한다.",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.erase(
        connection,
        {
          configId: nonexistentConfigId,
        },
      );
    },
  );
}
