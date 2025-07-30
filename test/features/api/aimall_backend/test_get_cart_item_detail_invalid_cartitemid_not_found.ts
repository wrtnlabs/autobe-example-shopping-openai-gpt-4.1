import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * 유효한 cartId와 존재하지 않는 cartItemId 조합으로 장바구니 아이템 조회시 에러 반환을 검증합니다.
 *
 * 목적 및 필요성: 고객의 장바구니 내부 아이템 상세 등 개인정보 보호를 위해,
 *
 * - CartId는 실제 존재하지만,
 * - CartItemId는 존재하지 않을 때(=해당 cart에 등록된 적 없는 cartItemId) 장바구니 상세조회 API가 적절한 404
 *   not found 에러를 반환하는지 확인합니다.
 *
 * 수행 절차:
 *
 * 1. 테스트용 고객 계정을 생성합니다.
 * 2. 해당 고객 소유 장바구니(cart)를 생성합니다.
 * 3. 유효 cartId와, 임의로 생성한(존재하지 않는) cartItemId 조합으로 상세조회 API 호출합니다.
 * 4. TestValidator.error로 에러(404 등)가 발생하는지 검증합니다.
 */
export async function test_api_aimall_backend_test_get_cart_item_detail_invalid_cartitemid_not_found(
  connection: api.IConnection,
) {
  // 1. 테스트용 고객 계정 생성
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: "010" + typia.random<string>().slice(0, 8),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. 고객 소유 장바구니 생성
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. 무작위(존재하지 않는) cartItemId로 상세조회 시도 및 에러 검사
  const nonExistingCartItemId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error(
    "존재하지 않는 cartItemId 상세조회 시 404 에러를 반환해야 합니다.",
  )(() =>
    api.functional.aimall_backend.customer.carts.cartItems.at(connection, {
      cartId: cart.id,
      cartItemId: nonExistingCartItemId,
    }),
  );
}
