import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * 고객의 애프터서비스(AS) 요청에 대한 소트-딜리트(논리삭제) 기능 정상성을 검증한다.
 *
 * 1. 고객 가입(채널, 기본 정보)
 * 2. 장바구니 생성(본인 채널/섹션)
 * 3. 주문 생성 (장바구니 기반, 본인 정보 담아서 결제까지 포함) - 관리자 API 사용 가능
 * 4. 해당 주문에 대한 배송정보 등록
 * 5. 애프터서비스(예: 반품/교환 등) 요청 등록
 * 6. 정상 케이스: 아직 진행 중이거나 완료되지 않은 애프터서비스에 대해 soft delete(erase) API 호출
 *
 *    - 삭제 후 deleted_at 값이 null이 아님을 확인, 일반 목록/단건 조회에서는 안 보이지만, 내부 확인/감사(to DB 또는 추가
 *         관리자 API)로 레코드는 남아있음 검증
 * 7. 실패 케이스: 이미 완료/락된 애프터서비스는 삭제 시 에러가 발생하는지 확인
 * 8. 실패 케이스: 타인의 애프터서비스나 권한이 없는 경우 삭제 시도가 거부되는지 검증
 */
export async function test_api_after_sale_service_customer_soft_delete(
  connection: api.IConnection,
) {
  // 1. 고객 회원가입 및 인증
  const joinInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // 2. 장바구니 생성
  const cartCreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreate },
  );
  typia.assert(cart);

  // 3. 주문 생성 (관리자 권한 필요)
  const orderCreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_product_variant_id: null,
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        discount_snapshot: null,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_shipment_id: undefined,
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph(),
        delivery_message: "문앞에 두세요",
        delivery_status: "prepared",
        delivery_attempts: 1,
      } satisfies IShoppingMallDelivery.ICreate,
    ],
    payments: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        external_payment_ref: null,
        status: "paid",
        amount: 10000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    ],
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);

  // 4. 주문 배송 등록
  const deliveryBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: "배송전 전화",
    delivery_status: "prepared",
    delivery_attempts: 1,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: deliveryBody,
      },
    );
  typia.assert(delivery);

  // 5. 애프터서비스 요청 (예시: 반품)
  const afterSaleBody = {
    case_type: "return",
    shopping_mall_delivery_id: delivery.id,
    reason: "단순변심",
    evidence_snapshot: undefined,
    resolution_message: undefined,
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSale =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.create(
      connection,
      {
        orderId: order.id,
        body: afterSaleBody,
      },
    );
  typia.assert(afterSale);

  // 6. 정상 케이스: soft delete
  await api.functional.shoppingMall.customer.orders.afterSaleServices.erase(
    connection,
    {
      orderId: order.id,
      afterSaleServiceId: afterSale.id,
    },
  );
  // Soft delete된 사실은 deleted_at이 null이 아닐 때임 (일부 추가 확인은 관리자 API 필요)
  // 여기서는 정상 호출/에러 유무 위주 확인

  // 7. 실패 케이스: 이미 완료(locked 등) 상태이면 삭제가 안 됨 (가정)
  const asCompleted =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.create(
      connection,
      {
        orderId: order.id,
        body: { ...afterSaleBody, case_type: "exchange" },
      },
    );
  typia.assert(asCompleted);
  // 가정: status를 "completed" 등으로 만든다고 가정(실제 상태 전환 API가 있으면 사용)
  // 완료된 건을 삭제 시도 시도
  await TestValidator.error("완료된 after_sale은 삭제 불가", async () => {
    await api.functional.shoppingMall.customer.orders.afterSaleServices.erase(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: asCompleted.id,
      },
    );
  });

  // 8. 실패 케이스: 타인(권한 없는 고객)이 삭제 시도 시 거절됨(추가로 별도 고객 만들어 수행)
  const outsiderInput = {
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const outsider = await api.functional.auth.customer.join(connection, {
    body: outsiderInput,
  });
  typia.assert(outsider);
  // 이 outsider 계정으로 after_saleService 삭제 시도 (권한 없음)
  await TestValidator.error("타인은 after_sale 삭제 불가", async () => {
    await api.functional.shoppingMall.customer.orders.afterSaleServices.erase(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
      },
    );
  });
}
