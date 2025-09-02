import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

/**
 * 쇼핑몰 고객의 정상 주문 생성 플로우를 검증합니다.
 *
 * 본 테스트에서는 고객 회원가입 후 인증 컨텍스트로 주문 생성 API(POST
 * /shoppingMallAiBackend/customer/orders)를 호출합니다. 필수 비즈니스 필드와 연결 정보를 모두
 * 포함하여 요청한 뒤, 반환된 주문이 고객 ID, 채널 ID, 금액, 상태 등 주요 정보를 올바르게 반영하고 비즈니스 오브젝트
 * 연관관계가 정확한지 확인합니다.
 *
 * 1. 고객 회원가입 및 인증
 * 2. 랜덤(유효) 주문 데이터 준비
 * 3. 주문 생성 API 호출
 * 4. 반환값 타입 assert 및 필드 유효성, 비즈니스 연결성 검증
 */
export async function test_api_customer_order_create_success(
  connection: api.IConnection,
) {
  // 1. 고객 회원가입 후 인증 토큰 획득(컨텍스트 자동 주입)
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(joinResult);

  // 2. 주문 생성용 데이터 준비
  const orderCreateBody: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null, // 셀러 없는 케이스로 기본값 사용
    code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    total_amount: 10000,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
    confirmed_at: null,
    cancelled_at: null,
    closed_at: null,
  };

  // 3. 주문 생성 API 호출
  const output =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(output);

  // 4. 반환값 및 비즈니스 유효성 검증
  TestValidator.equals(
    "주문-고객ID일치",
    output.shopping_mall_ai_backend_customer_id,
    joinResult.customer.id,
  );
  TestValidator.equals(
    "주문-채널ID일치",
    output.shopping_mall_ai_backend_channel_id,
    orderCreateBody.shopping_mall_ai_backend_channel_id,
  );
  TestValidator.equals("주문코드일치", output.code, orderCreateBody.code);
  TestValidator.equals("주문상태일치", output.status, orderCreateBody.status);
  TestValidator.equals(
    "주문금액일치",
    output.total_amount,
    orderCreateBody.total_amount,
  );
  TestValidator.equals(
    "주문통화일치",
    output.currency,
    orderCreateBody.currency,
  );
  TestValidator.predicate(
    "주문ID(uuid) 유효성",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.predicate(
    "주문 타임스탬프 유효성",
    typeof output.ordered_at === "string" && output.ordered_at.length > 0,
  );
}
