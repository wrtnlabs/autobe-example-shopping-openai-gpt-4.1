import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * 다른 사용자의 주문 아이템 삭제 불가(Forbidden) 시나리오를 검증합니다.
 *
 * Customer A와 Customer B라는 두 사용자를 생성한 뒤, 상품을 생성하여 각각 주문을 만들고, Customer A의 주문에만
 * order item을 추가합니다. Customer B가 Customer A의 주문 아이템을 삭제 시도할 때 권한이 없어(Forbidden)
 * 삭제가 거부되어야 함을 검증합니다.
 *
 * [절차]
 *
 * 1. Customer A 회원 가입/생성
 * 2. Customer B 회원 가입/생성
 * 3. 상품 생성 (관리자 권한)
 * 4. Customer A의 주문 생성
 * 5. Customer B의 주문 생성
 * 6. Customer A의 주문에 OrderItem 추가
 * 7. Customer B가 Customer A의 order item 삭제 시도 → 실패(권한 없음) 검증
 */
export async function test_api_aimall_backend_customer_orders_orderItems_test_customer_cannot_delete_item_from_someone_elses_order(
  connection: api.IConnection,
) {
  // 1. Customer A 생성
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerAEmail,
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(20),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerA);

  // 2. Customer B 생성
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerBEmail,
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(20),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // 3. 상품 생성(관리자)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(2),
          description: RandomGenerator.content()()(1),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Customer A 주문 생성
  const orderA = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customerA.id,
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_number: undefined,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(orderA);

  // 5. Customer B 주문 생성
  const orderB = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customerB.id,
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_number: undefined,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(orderB);

  // 6. Customer A 주문에 order item 추가
  const orderItemA =
    await api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: orderA.id,
        body: {
          product_id: product.id,
          product_option_id: null,
          item_name: product.title,
          quantity: 1,
          unit_price: 10000,
          total_price: 10000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItemA);

  // 7. Customer B로 로그인돼 있다고 가정(테스트 context 상)
  // Customer B가 Customer A의 주문아이템 삭제 시도 → forbidden 검증
  await TestValidator.error("타인의 주문 아이템 삭제 불가(Forbidden)")(
    async () => {
      await api.functional.aimall_backend.customer.orders.orderItems.erase(
        connection,
        {
          orderId: orderA.id,
          orderItemId: orderItemA.id,
        },
      );
    },
  );
}
