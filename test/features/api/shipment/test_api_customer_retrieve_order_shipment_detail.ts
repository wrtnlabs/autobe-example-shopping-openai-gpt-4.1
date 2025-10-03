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
 * 고객이 본인 주문의 특정 배송배치 상세 정보를 정상적으로 조회할 수 있는지, 그리고 본인 소유가 아닌 배송이나 존재하지 않는 배송ID
 * 조회시 에러가 발생하는지 검증한다.
 *
 * 1. 채널/섹션 UUID를 랜덤으로 생성한다.
 * 2. IShoppingMallCustomer.IJoin 타입으로 고객 계정 생성 및 인증 - 해당 채널ID 및 email, name,
 *    password, phone 포함.
 * 3. 고객 UUID, 채널, 섹션, source 등으로 cart 생성.
 * 4. 주문 데이터(IShoppingMallOrder.ICreate)를 customer id, channel, section, cart id 등
 *    위 데이터로 준비하여 관리자의 주문생성 API로 생성한다.
 *
 *    - 주문상품 정보(order_items)는 임의 product/seller UUID, 가격, quantity 등 랜덤값으로 만들어 1 ~ 2개
 *         포함.
 *    - 결제정보(payments)도 적정하게 random 값 생성, deliveries 배열도 필수입력값 맞게 준비.
 * 5. 해당 주문(id)로 shipment 등록(IShoppingMallShipment.ICreate)을 위한 셀러id, 코드, carrier,
 *    status 등 필수입력값, null 허용 필드는 랜덤/undefined/null 조합으로 입력한다.
 * 6. Customer 본인 컨텍스트로 주문id, shipment id로 상세정보 조회를 요청하여, 반환값이 shipment 등록 시 입력값과
 *    정확히 일치하는지(상태/코드/셀러/외부트래킹 등) 검증한다.
 * 7. 존재하지 않는 shipment_id, 혹은 본인 소유가 아닌 shipment_id로 요청시 권한에러/NotFound 오류가 발생하는지도
 *    TestValidator.error로 확인한다.
 */
export async function test_api_customer_retrieve_order_shipment_detail(
  connection: api.IConnection,
) {
  // 1. 채널/섹션 UUID 준비
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();

  // 2. 고객 회원가입 및 인증
  const customerJoinInput = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customer);

  // 3. cart 생성
  const cartInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // 4. 주문 생성 (관리자 경로)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  const orderInput: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 33000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: "", // 관리자 생성시 생성직후 매핑됨
        shopping_mall_product_id: productId,
        shopping_mall_seller_id: sellerId,
        quantity: 1,
        unit_price: 33000,
        final_price: 33000,
        discount_snapshot: null,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [
      {
        shopping_mall_order_id: "", // 주문 생성시 자동매핑
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph(),
        delivery_message: RandomGenerator.paragraph(),
        delivery_status: "prepared",
        delivery_attempts: 0,
      } satisfies IShoppingMallDelivery.ICreate,
    ],
    payments: [
      {
        shopping_mall_order_id: "", // 주문 생성시 자동매핑
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        status: "paid",
        amount: 33000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    ],
  };
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 5. shipment 등록 (관리자)
  const shipmentInput: IShoppingMallShipment.ICreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_seller_id: sellerId,
    shipment_code: RandomGenerator.alphaNumeric(12),
    carrier: RandomGenerator.name(1),
    status: "pending",
    external_tracking_number: RandomGenerator.alphaNumeric(10),
    requested_at: new Date().toISOString(),
  };
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      { orderId: order.id, body: shipmentInput },
    );
  typia.assert(shipment);

  // 6. 고객이 본인 주문 배송 상세정보 조회, 값일치 검증
  const got = await api.functional.shoppingMall.customer.orders.shipments.at(
    connection,
    { orderId: order.id, shipmentId: shipment.id },
  );
  typia.assert(got);
  TestValidator.equals(
    "shipment 배치코드 일치",
    got.shipment_code,
    shipmentInput.shipment_code,
  );
  TestValidator.equals("배송 상태 일치", got.status, shipmentInput.status);
  TestValidator.equals(
    "carrier 데이터 일치",
    got.carrier,
    shipmentInput.carrier,
  );
  TestValidator.equals(
    "tracking number 일치",
    got.external_tracking_number,
    shipmentInput.external_tracking_number,
  );
  TestValidator.equals("셀러 ID 일치", got.shopping_mall_seller_id, sellerId);
  TestValidator.equals("order ID 일치", got.shopping_mall_order_id, order.id);

  // 7. 본인 소유가 아닌 주문ID 및 shipmentID(랜덤) 조회 시도: 권한orNotFound 에러 체크
  await TestValidator.error(
    "다른 주문의 shipment ID(없는/permission 없는)에 접근시 에러",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.error(
    "본인 주문이지만 shipment id가 잘못된 경우 에러",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderId: order.id,
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
