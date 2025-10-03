import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerIdentity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerIdentity";

/**
 * 관리자가 특정 고객의 신원확인(본인인증) 기록에 대해 soft delete API의 정상 호출 및 에러 케이스만 검증하는 축소 시나리오.
 * 실제로 identity 생성/삭제/리스트 조작이 불가능하므로, 랜덤 uuid를 사용하여 정상/에러 응답만을 확인한다.
 *
 * 1. 관리자로 가입 및 토큰 인증
 * 2. (데이터가 없으므로) 랜덤 customer/identity uuid로 삭제 시 단순 호출 → 실패(404) 케이스 검증
 * 3. 동일 identity 재삭제 등 double-delete 케이스도 404로 처리되는지 검증
 */
export async function test_api_admin_soft_delete_customer_identity_verification_record(
  connection: api.IConnection,
) {
  // 1. 관리자 가입 후 토큰 발급 (기본 기능 정상 확인)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. 임의의 customer/identity uuid로 삭제 시도 (존재하지 않음 → 실패)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const identityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent identity returns error",
    async () => {
      await api.functional.shoppingMall.admin.customers.identities.erase(
        connection,
        {
          customerId: customerId,
          identityId: identityId,
        },
      );
    },
  );

  // 3. 동일 identity를 double-delete (계속 호출해도 error 반환)
  await TestValidator.error(
    "double delete of non-existent identity returns error",
    async () => {
      await api.functional.shoppingMall.admin.customers.identities.erase(
        connection,
        {
          customerId: customerId,
          identityId: identityId,
        },
      );
    },
  );
}
