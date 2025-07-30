import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * 장바구니 상품/옵션/SKU 중복 추가 방지 검증
 *
 * 장바구니에 동일한 상품/옵션/SKU 조합의 아이템을 2회 추가하면 unique constraint에 의해 두 번째 시도는 오류가 발생해야
 * 한다. 이로써 business rule(장바구니에 같은 상품+옵션+SKU 조합은 1개 아이템만 허용) 준수를 검증한다.
 *
 * 1. 고객 계정 생성
 * 2. 고객 장바구니 생성
 * 3. Cart item 최초 1회 추가
 * 4. 동일 정보로 cart item 중복 추가 시도 & error 검증
 */
export async function test_api_aimall_backend_customer_carts_test_add_duplicate_cart_item_for_same_product_option_fails(
  connection: api.IConnection,
) {
  // 1. 고객 계정 생성
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. 고객 장바구니 생성
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. 장바구니에 cart item 첫 추가 (임의 상품/옵션/SKU 값)
  const cartItemBody: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    aimall_backend_product_option_id: typia.random<boolean>()
      ? typia.random<string & tags.Format<"uuid">>()
      : null,
    aimall_backend_sku_id: typia.random<boolean>()
      ? typia.random<string & tags.Format<"uuid">>()
      : null,
    quantity: 1,
    unit_price_snapshot: 10000,
    discount_snapshot: null,
    selected_name_display: "테스트상품/옵션",
  };
  const firstItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(firstItem);

  // 4. 동일 상품/옵션/SKU 조합으로 cart item 중복 추가 시도 → 오류 발생해야 함
  await TestValidator.error("장바구니 동일 상품/옵션/sku 중복 추가 제한 처리")(
    async () => {
      await api.functional.aimall_backend.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemBody,
        },
      );
    },
  );
}
