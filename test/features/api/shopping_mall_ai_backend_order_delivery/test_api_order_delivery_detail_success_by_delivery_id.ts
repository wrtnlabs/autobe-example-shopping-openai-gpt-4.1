import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";

export async function test_api_order_delivery_detail_success_by_delivery_id(
  connection: api.IConnection,
) {
  /**
   * 쇼핑몰 고객 배송 상세 정보 조회 성공 시나리오.
   *
   * 인증된 고객이 주문을 생성(또는 사전 생성된 주문-배송 데이터가 존재한다고 가정)한 후 해당 주문의 배송(delivery) 상세 정보를
   * 조회한다.
   *
   * 1. 고객 회원으로 가입(POST /auth/customer/join)
   * 2. 가입된 고객 계정으로 로그인된 상태에서(실제 POST /auth/customer/join 응답 내장) 주문ID(orderId)와
   *    배송ID(deliveryId)에 해당하는 유효한 쌍을 준비한다.
   * 3. 해당 주문의 배송 상세정보 조회(GET
   *    /shoppingMallAiBackend/customer/orders/{orderId}/deliveries/{deliveryId}),
   *    반환값을 DTO 타입과 일치하는지 typia.assert로 검증한다.
   * 4. 반환된 주문ID/배송ID가 실제 조회 요청에 사용한 값들과 일치하는지 TestValidator.equals로 검증한다.
   */

  // 1. 고객 회원가입 및 로그인
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "Passw0rd!@#",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. (실제 환경에서는 주문 및 배송 생성이 필요하나 해당 API가 없으므로)
  //   임시로 typia.random으로 주문/배송 id 준비.
  //   실제 구현에서는 주문과 배송을 생성 후 그 id를 활용해야 한다.
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const fakeDeliveryId = typia.random<string & tags.Format<"uuid">>();

  // 3. 배송 상세조회 (주문ID, 배송ID 기준)
  const deliveryDetail =
    await api.functional.shoppingMallAiBackend.customer.orders.deliveries.at(
      connection,
      {
        orderId: fakeOrderId,
        deliveryId: fakeDeliveryId,
      },
    );
  typia.assert(deliveryDetail);
  // 4. 반환값이 요청한 주문ID/배송ID와 일치하는지 확인
  TestValidator.equals(
    "요청한 주문ID와 반환 결과 orderId 일치 여부",
    deliveryDetail.shopping_mall_ai_backend_order_id,
    fakeOrderId,
  );
  TestValidator.equals(
    "요청한 배송ID와 반환 결과 deliveryId 일치 여부",
    deliveryDetail.id,
    fakeDeliveryId,
  );
}
