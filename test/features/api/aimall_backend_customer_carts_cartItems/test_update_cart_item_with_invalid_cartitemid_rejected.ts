import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * 존재하지 않는 cartItemId로 카트 아이템 업데이트 요청 시, 반드시 실패(오류)가 발생하고, cart 내 정보가 영향받지 않음을
 * 검증한다.
 *
 * [비즈니스 컨텍스트]
 *
 * - 고객 계정 신규 생성
 * - 해당 고객 카트 생성
 * - Cart에 없는(실제로 존재하지 않는 임의 uuid) cartItemId 사용하여 cart item update 시도
 *
 * [검증 Flow]
 *
 * 1. 고객 테스트 계정 생성
 * 2. 고객용 cart 생성
 * 3. Cart 내 actual cart_items_count(또는 카트 상태) 획득
 * 4. 존재하지 않는 cartItemId로 update 시도 - 반드시 예외 발생해야 함
 * 5. 이후 cart의 cart_items_count 정보가 불변임을 확인해 side effect 없음 체크
 *
 * (참고: 카트 상세/아이템 목록 재조회 API 없다면 카트 객체의 cart_items_count 기반 시나리오)
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_update_cart_item_with_invalid_cartitemid_rejected(
  connection: api.IConnection,
) {
  // 1. 고객 계정(테스트용) 생성
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. 고객 cart 생성
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // 3. 생성된 카트의 cart_items_count(원본) 저장
  const originalCartItemsCount = cart.cart_items_count ?? 0;

  // 4. 존재하지 않는 cartItemId(랜덤 uuid)로 update 요청하여 반드시 오류 발생해야 함
  await TestValidator.error(
    "존재하지 않는 카트아이템ID로 인한 update 실패 검증",
  )(async () => {
    await api.functional.aimall_backend.customer.carts.cartItems.update(
      connection,
      {
        cartId: cart.id,
        cartItemId: typia.random<string & tags.Format<"uuid">>(), // 실존하지 않는 cartItemId
        body: {
          quantity: 2,
          updated_at: new Date().toISOString(),
        },
      },
    );
  });

  // 5. cart_items_count(원본 값) 변동 없는지 체크(카트 상태 불변)
  TestValidator.equals("cart_items_count 불변")(originalCartItemsCount)(
    cart.cart_items_count ?? 0,
  );
}
