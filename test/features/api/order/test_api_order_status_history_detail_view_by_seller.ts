import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * 판매자가 특정 주문의 상태 이력 이벤트 단일건 상세를 조회하는 케이스 검증
 *
 * 1. 판매자/고객 회원가입(각각 독립된 계정)
 * 2. 주문 주소&결제수단 스냅샷 생성
 * 3. 고객이 주문 생성
 * 4. 판매자가 해당 주문의 상태이력(최신 이벤트) 단건 상세조회
 * 5. 결과 데이터 무결성확인, 잘못된 요청/권한 오류 확인
 */
export async function test_api_order_status_history_detail_view_by_seller(
  connection: api.IConnection,
) {
  // 판매자 회원가입
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(13),
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 고객 회원가입
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customer);

  // 주문용 주소 스냅샷 생성
  const orderAddressCreate = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 2 }),
    address_detail: RandomGenerator.paragraph({ sentences: 1 }),
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressCreate },
    );
  typia.assert(orderAddress);

  // 결제수단 스냅샷 생성(관리자 권한 API)
  const paymentCreate = {
    payment_method_type: "card",
    method_data: "4111-****-****-1111",
    display_name: "VISA(테스트)",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const payment: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentCreate },
    );
  typia.assert(payment);

  // 고객이 주문 생성
  const orderCreate = {
    shipping_address_id: orderAddress.id,
    payment_method_id: payment.id,
    order_total: 12900,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 판매자 토큰 컨텍스트 재설정 (판매자 권한으로 API 콜)
  connection.headers ??= {};
  connection.headers.Authorization = seller.token.access;

  // 주문 상태이력 최신 id 추출(최소 한 건 존재해야 함)
  // NOTE: 실제로 상태이력 생성 API 없음(기본적으로 주문 생성시 1건 만들어짐)
  // 여기선 생성 직후 최신 id가 필요하므로 주문 id와 동일 uuid로 조회를 시도해야 함
  // 실제 응답에서는 statusHistoryId를 일부러 잘못 지정해서 오류 발생도 확인 가능함
  // 정상 scenario: 최신 orderStatusHistory를 id 그대로 조회
  const legitStatusHistoryId = order.id as string & tags.Format<"uuid">;
  const statusHistory: IShoppingMallOrderStatusHistory =
    await api.functional.shoppingMall.seller.orders.statusHistory.at(
      connection,
      { orderId: order.id, statusHistoryId: legitStatusHistoryId },
    );
  typia.assert(statusHistory);
  TestValidator.equals(
    "statusHistory 의 주문 id 일치",
    statusHistory.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "판매자 id 일치",
    statusHistory.actor_seller_id,
    seller.id,
  );

  // 오류: 임의로 잘못된 상태이력 id로 조회 시도
  const wrongUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 statusHistoryId 조회시 오류",
    async () => {
      await api.functional.shoppingMall.seller.orders.statusHistory.at(
        connection,
        { orderId: order.id, statusHistoryId: wrongUuid },
      );
    },
  );

  // 오류: 고객 토큰으로 접근 시도시(권한없는 계정)
  connection.headers.Authorization = customer.token.access;
  await TestValidator.error("고객 토큰으로 조회시 권한 오류", async () => {
    await api.functional.shoppingMall.seller.orders.statusHistory.at(
      connection,
      { orderId: order.id, statusHistoryId: legitStatusHistoryId },
    );
  });
}
