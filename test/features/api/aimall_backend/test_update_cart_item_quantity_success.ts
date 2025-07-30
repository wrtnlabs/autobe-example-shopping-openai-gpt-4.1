import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * E2E 테스트: 고객 장바구니 아이템 수량 업데이트
 *
 * 이 테스트는 고객이 본인의 장바구니에 담긴 아이템의 수량을 정상적으로 수정/갱신할 수 있는지 검증합니다. 비즈니스 워크플로우는 아래와
 * 같습니다.
 *
 * 1. 테스트 고객 계정을 생성합니다.
 * 2. 해당 고객 소유의 장바구니를 생성합니다.
 * 3. 임의 상품 옵션으로 장바구니 아이템을 추가합니다.
 * 4. 해당 장바구니 아이템의 quantity 값을 증가/변경하여 update API를 호출합니다.
 * 5. Update API의 응답으로 실제 수량이 변경되어 반환되는지 확인합니다.
 * 6. 이후 추가 요청 등으로 변경사항이 정상 반영되어 유지되는지 검증합니다.
 */
export async function test_api_aimall_backend_test_update_cart_item_quantity_success(
  connection: api.IConnection,
) {
  // 1. 테스트 고객 생성 (status는 active, 고유 email+phone)
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. 장바구니 생성 (해당 고객 소유)
  const cartInput: IAimallBackendCart.ICreate = {
    aimall_backend_customer_id: customer.id,
  };
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // 3. 장바구니 아이템 추가 (최소 요구 필드: product_id, quantity, unit_price_snapshot)
  // 임의 product_id 값 및 realistic unit_price_snapshot 설정
  const cartItemInput: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price_snapshot: 12000,
  };
  const cartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      { cartId: cart.id, body: cartItemInput },
    );
  typia.assert(cartItem);

  // 4. cart item 수량 업데이트 (ex: 1 -> 3)
  const updatedQty = 3;
  const updateInput: IAimallBackendCartItem.IUpdate = {
    quantity: updatedQty,
    updated_at: new Date().toISOString(),
  };
  const updatedItem =
    await api.functional.aimall_backend.customer.carts.cartItems.update(
      connection,
      { cartId: cart.id, cartItemId: cartItem.id, body: updateInput },
    );
  typia.assert(updatedItem);

  // 5. 응답값의 quantity가 갱신된 값인지 검증
  TestValidator.equals("cart item quantity updated")(updatedItem.quantity)(
    updatedQty,
  );

  // 6. 추가 read API가 없어, update 응답값까지만 유지 검증
}
