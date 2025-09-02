import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

/**
 * 테스트 목적: 고객은 다른 고객의 주문을 수정할 수 없어야 하며, 이를 통해 소유권 및 권한 정책이 올바르게 적용되는지 검증한다.
 *
 * 1. Customer1 회원가입 및 인증
 * 2. Customer1의 주문 생성 (주문정보 확보)
 * 3. Customer2 회원가입 및 인증(권한 변경용)
 * 4. Customer2 상태에서 customer1의 주문에 대해 PUT
 *    /shoppingMallAiBackend/customer/orders/{orderId} 호출
 *
 *    - 임의의 주문 변경 정보 전달 (예: status, delivery_notes 등)
 *    - 권한/비즈니스 에러 발생 확인
 *    - 주문 정보가 변경되지 않았음을 확인(가능하면 기존 정보와 비교)
 *
 * 검증 포인트:
 *
 * - Customer2가 customer1의 주문을 수정하려고 하면 적절한 권한에러(비즈니스 에러, 권한 부족 등)가 발생하는지 확인
 * - 에러 발생 시 주문에는 아무런 변경이 적용되지 않는지 확인 (order field unchanged)
 */
export async function test_api_customer_order_update_unauthorized_access_failure(
  connection: api.IConnection,
) {
  // 1. customer1 회원가입 및 인증
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      phone_number: RandomGenerator.mobile(),
      password: "TestPassword1!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1Join);
  const customer1 = customer1Join.customer;

  // 2. customer1의 주문 생성
  const orderCreateInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customer1.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    code: RandomGenerator.alphaNumeric(12),
    status: "pending",
    total_amount: 50000,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
    confirmed_at: null,
    cancelled_at: null,
    closed_at: null,
  };
  const createdOrder =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderCreateInput },
    );
  typia.assert(createdOrder);

  // 3. customer2 회원가입 및 인증 (고객2로 인증 정보 변환)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      phone_number: RandomGenerator.mobile(),
      password: "TestPassword2@",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2Join);

  // 4. customer2 상태에서 customer1의 주문 수정 시도
  //    잘못된 접근이므로 에러 발생을 확인한다.
  const updateInput: IShoppingMallAiBackendOrder.IUpdate = {
    status: "confirmed",
    delivery_notes: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    delivery_address: RandomGenerator.paragraph({ sentences: 3 }),
    customer_note: RandomGenerator.paragraph({ sentences: 2 }),
    updated_at: new Date().toISOString(),
  };
  await TestValidator.error(
    "다른 고객이 주문을 수정하면 권한 에러가 발생해야 한다.",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.update(
        connection,
        {
          orderId: createdOrder.id,
          body: updateInput,
        },
      );
    },
  );

  // 추후, API에서 주문 조회 엔드포인트가 제공되면 기존 데이터가 변경되지 않았는지도 추가 확인 가능
}
