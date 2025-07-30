import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * 관리자 권한으로 특정 주문의 상세 주문 상품 정보를 정상적으로 조회할 수 있는지 검증합니다.
 *
 * 시나리오는 다음과 같이 전체 비즈니스 플로우를 따라갑니다:
 *
 * 1. (의존성 준비) 관리자가 새로운 주문을 생성합니다. (필수 필드: customer_id, seller_id, address_id,
 *    order_status, total_amount, currency)
 * 2. 해당 주문에 주문 상품을 1개 추가합니다. (필수 필드: product_id, product_option_id, item_name,
 *    quantity, unit_price, total_price)
 * 3. 방금 생성한 orderItem의 ID를 이용해 상세 조회 API
 *    (/aimall-backend/administrator/orders/{orderId}/orderItems/{orderItemId})를
 *    호출합니다.
 * 4. 조회 결과로 반환된 주문 상품 객체의 id, order_id, product_id, product_option_id, item_name,
 *    quantity, unit_price, total_price 각각이 최초 입력 데이터 또는 생성된 값과 일치함을 검증합니다.
 * 5. 각 단계의 결과에 대해 타입 런타임 검증(typia.assert)과 비즈니스 필드 일치 검증(TestValidator.equals)을
 *    수행하여 정확성과 모순 없는 데이터 흐름을 보장합니다.
 */
export async function test_api_aimall_backend_test_admin_retrieve_specific_order_item_detail_success(
  connection: api.IConnection,
) {
  // 1. 주문 생성 (관리자 권한)
  const orderCreateInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: undefined, // 시스템 자동 생성 위임
    order_status: "pending",
    total_amount: 100000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderCreateInput },
  );
  typia.assert(order);

  // 2. 주문 상품 추가 (하나)
  const orderItemCreateInput: IAimallBackendOrderItem.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    product_option_id: null,
    item_name: "테스트 상품명",
    quantity: 2,
    unit_price: 50000,
    total_price: 100000,
  };
  const createdOrderItem =
    await api.functional.aimall_backend.administrator.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: orderItemCreateInput,
      },
    );
  typia.assert(createdOrderItem);

  // 3. 생성된 orderItemId로 상세정보 조회
  const retrievedOrderItem =
    await api.functional.aimall_backend.administrator.orders.orderItems.at(
      connection,
      {
        orderId: order.id,
        orderItemId: createdOrderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);

  // 4. 응답 필드 값이 데이터 흐름과 완전히 일치하는지 검증
  TestValidator.equals("order item id 일치")(retrievedOrderItem.id)(
    createdOrderItem.id,
  );
  TestValidator.equals("order id 일치")(retrievedOrderItem.order_id)(order.id);
  TestValidator.equals("product id 일치")(retrievedOrderItem.product_id)(
    orderItemCreateInput.product_id,
  );
  TestValidator.equals("product option id 일치")(
    retrievedOrderItem.product_option_id,
  )(orderItemCreateInput.product_option_id);
  TestValidator.equals("item name 일치")(retrievedOrderItem.item_name)(
    orderItemCreateInput.item_name,
  );
  TestValidator.equals("quantity 일치")(retrievedOrderItem.quantity)(
    orderItemCreateInput.quantity,
  );
  TestValidator.equals("unit price 일치")(retrievedOrderItem.unit_price)(
    orderItemCreateInput.unit_price,
  );
  TestValidator.equals("total price 일치")(retrievedOrderItem.total_price)(
    orderItemCreateInput.total_price,
  );
}
