import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_article_category_hard_delete_not_found(
  connection: api.IConnection,
) {
  /**
   * 관리자 권한으로 존재하지 않는 article category UUID를 하드삭제 시도 시 not found 오류 발생 검증.
   *
   * 1. /auth/admin/join을 통해 관리자로 회원가입(인증 세션 획득)
   * 2. 무작위(랜덤) UUID로 DELETE
   *    /shoppingMallAiBackend/admin/articleCategories/{articleCategoryId} 요청
   * 3. Not-found(404) 또는 유사 에러를 올바르게 반환하는지 검증
   */

  // 1. 관리자 회원가입 및 세션 획득
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. 임의의(존재하지 않는) UUID로 카테고리 하드삭제 시도
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. not-found(404) 또는 유사 에러 확인
  await TestValidator.error(
    "존재하지 않는 article category ID에 대해 하드삭제 시도시 not-found 에러 발생",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.articleCategories.erase(
        connection,
        {
          articleCategoryId: invalidCategoryId,
        },
      );
    },
  );
}
