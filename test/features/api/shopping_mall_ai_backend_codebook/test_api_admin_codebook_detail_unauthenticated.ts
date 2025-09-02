import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_admin_codebook_detail_unauthenticated(
  connection: api.IConnection,
) {
  /**
   * 인증되지 않은 사용자가 어드민 코드북 상세 조회 API를 호출할 때 권한 에러가 발생하는지 검증합니다.
   *
   * [시나리오]
   *
   * 1. 어드민 계정 준비 (join: /auth/admin/join). 단, 로그인/토큰 발급은 하지 않음.
   * 2. 인증 없는 커넥션({ headers: {} })으로 무작위 codebookId로 detail 요청
   * 3. 반드시 TestValidator.error로 권한 에러(401/403 등의 Authorization Error)를 검증
   *
   * 추가 설명:
   *
   * - 이 테스트는 codebook이 실제로 존재하는지 여부와 무관하며, '미인증 상태에서 보호된 admin 엔드포인트가 접근 불가'임을
   *   보장하는 데 목적이 있습니다.
   */
  // 1. 어드민 계정 생성(의존성 준비)
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // 2. 인증 없는 커넥션을 생성 (headers: {}로 Authorization 제거)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. 임의의 codebookId로 protection된 admin codebook detail에 접근 시도 → 권한에러 검증
  await TestValidator.error(
    "미인증 사용자의 admin codebook 상세조회 시도는 권한 에러가 발생해야 한다",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.at(
        unauthConn,
        {
          codebookId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
