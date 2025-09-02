import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_customer_cart_detail_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  /**
   * 인증되지 않은 사용자의 장바구니 상세 조회 접근 제한 테스트
   *
   * 본 테스트는 인증되지 않은(즉, Authorization 헤더가 없는) 상태에서 장바구니 상세 조회
   * 엔드포인트(/shoppingMallAiBackend/customer/carts/{cartId})를 호출할 때 적절한 인증(권한 없음)
   * 오류가 발생하는지 확인한다. 장바구니 ID(cartId)는 실제 고객 회원 가입 후 획득해야 한다.
   *
   * 1. 고객 계정 가입 및 인증 토큰 획득 (선행 작업)
   * 2. (테스트 목적상) 임의 cartId 생성 또는 실제 고객의 cartId 확보
   * 3. 인증 정보를 제거(Authorization 헤더 없이)한 connection 새로 생성
   * 4. 인증되지 않은 연결로 카트 상세 조회 시도 및 권한 없음(401/403 등) 오류 확인
   */

  // 1. 고객 회원 가입(인증 토큰 획득용)
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. (실서비스라면 회원별 cartId를 데이터로부터 확보)
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. 인증정보 없는 새 connection 준비
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. 인증 없는 상태에서 장바구니 상세 API 호출 시도, 권한 오류 검증
  await TestValidator.error(
    "인증되지 않은 접근 시 카트 상세 조회 불가(권한 오류)",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.at(unauthConn, {
        cartId,
      });
    },
  );
}
