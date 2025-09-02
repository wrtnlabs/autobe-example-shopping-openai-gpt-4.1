import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";

export async function test_api_admin_customer_session_update_success(
  connection: api.IConnection,
) {
  /**
   * 관리자 권한으로 고객 세션 정보를 성공적으로 업데이트하는 시나리오.
   *
   * 1. 새로운 관리자 계정 생성 및 인증
   * 2. 고객 회원 가입 및 ID 확보
   * 3. 고객 로그인하여 세션 생성 및 access_token 확보
   * 4. 관리자 권한으로 해당 고객의 세션 속성(ip_address, expires_at, terminated_at) 변경
   * 5. 반환된 결과가 입력값(업데이트 필드)과 일치하는지 검증
   */
  // 1. 관리자 회원가입 및 토큰 발급(자동 반영)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(10)}@admin-test.com` as string &
        tags.Format<"email">,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. 고객 회원가입
  const customerEmail =
    `${RandomGenerator.alphabets(12)}@customer-test.com` as string &
      tags.Format<"email">;
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = typia.assert(customerJoin.customer.id);

  // 3. 고객 로그인 (세션 access_token 확보)
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string & tags.Format<"password">,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(customerLogin);
  const sessionAccessToken: string = customerLogin.token.access;

  // 실제 sessionId는 별도 발급이나, E2E 환경에서는 access_token을 sessionId로 활용
  const sessionId = sessionAccessToken as string & tags.Format<"uuid">;

  // 4. 관리자로 해당 세션 정보 업데이트(terminated_at, ip_address, expires_at)
  const updatePayload: IShoppingMallAiBackendCustomerSession.IUpdate = {
    ip_address: [
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
      >(),
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
      >(),
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
      >(),
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
      >(),
    ].join("."),
    expires_at: new Date(
      Date.now() + 2 * 86400 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
    terminated_at: new Date().toISOString() as string &
      tags.Format<"date-time">,
  };
  const updatedSession =
    await api.functional.shoppingMallAiBackend.admin.customers.sessions.update(
      connection,
      {
        customerId,
        sessionId,
        body: updatePayload,
      },
    );
  typia.assert(updatedSession);

  // 5. 검증: 변경 필드가 정상 반영됨을 확인
  TestValidator.equals(
    "세션 termination 시간이 정확히 반영됨",
    updatedSession.terminated_at,
    updatePayload.terminated_at,
  );
  TestValidator.equals(
    "세션 ip_address가 변경됨",
    updatedSession.ip_address,
    updatePayload.ip_address,
  );
  TestValidator.equals(
    "세션 만료일 갱신됨",
    updatedSession.expires_at,
    updatePayload.expires_at,
  );
}
