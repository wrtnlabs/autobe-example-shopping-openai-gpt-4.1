import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";

export async function test_api_order_delivery_detail_forbidden_if_not_authenticated(
  connection: api.IConnection,
) {
  /**
   * 인증 없이 주문 배송 상세 조회 거부 검증 테스트
   *
   * - 본 테스트는 주문 배송 정보를 조회할 때 인증이 필수임을 검증한다.
   * - 사전 준비로 정상적인 customer 계정만 가입해 둔다.
   * - 실제 배송/주문 존재 여부와 상관없이, 인증(Authorization)이 없는 connection으로 조회를 시도해야 ‘권한
   *   없음’(Authentication/Authorization failure) 오류가 필수임을 검증한다.
   *
   * 테스트 절차:
   *
   * 1. 정상 customer 계정을 가입한다(POST /auth/customer/join).
   * 2. 임의의 주문, 배송 UUID를 생성한다.
   * 3. Authorization 헤더가 없는 connection 객체를 만든다.
   * 4. 인증 없이 주문배송 상세조회 API 호출 시도 후,
   * 5. 인증 실패(권한 없음) 오류를 올바르게 반환하는지 검증한다.
   */

  // 1. 고객 계정 가입(인증 토큰 발급, 실제 주문/배송 생성까지는 불필요)
  const join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(join);

  // 2. (본 시나리오에선 실제 값의 유효성은 중요치 않음)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();

  // 3. 인증 없는 connection 객체(Authorization 헤더 미포함)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 4~5. 인증 없이 주문배송 상세조회 시도 시 반드시 인증 실패 오류 검증
  await TestValidator.error(
    "인증 없이 주문 배송 상세 조회 시도는 실패해야 한다.",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.deliveries.at(
        unauthConnection,
        { orderId, deliveryId },
      );
    },
  );
}
