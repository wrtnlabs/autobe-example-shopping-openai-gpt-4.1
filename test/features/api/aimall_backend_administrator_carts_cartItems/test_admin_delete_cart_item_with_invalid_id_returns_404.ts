import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * 관리자(admin)가 존재하지 않는 cartItemId로 장바구니 아이템 삭제를 시도할 때 404 not found가 발생하는지
 * 검증합니다.
 *
 * 비즈니스 목적:
 *
 * - 장바구니(cart)는 적어도 1개가 생성되어 있어야 하며,
 * - 실제 존재하지 않는 cartItemId(랜덤 UUID 또는 오래된/폐기된 값)를 사용하여 삭제를 요청할 경우,
 * - 시스템은 404 not found 오류를 반환하여 잘못된 삭제 요청에 대해 클린하게 처리함을 보장합니다.
 *
 * 테스트 순서:
 *
 * 1. 고객 계정(장바구니 소유자) 등록
 * 2. 관리자가 해당 고객 소유의 장바구니(cart) 추가 (cartId 확보)
 * 3. 존재하지 않는 cartItemId(임의의 UUID) 생성
 * 4. 해당 cartId와 cartItemId로 아이템 삭제 시도 (admin endpoint 사용)
 * 5. 삭제 요청은 404 not found 오류를 반환하는지 확인
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_admin_delete_cart_item_with_invalid_id_returns_404(
  connection: api.IConnection,
) {
  // 1. 고객 계정 등록
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

  // 2. 관리자가 해당 고객의 장바구니 생성
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. 존재하지 않는 cartItemId(UUID) 생성
  const fakeCartItemId = typia.random<string & tags.Format<"uuid">>();

  // 4. 삭제 시도 및 404 not found 오류 확인
  await TestValidator.error("존재하지 않는 cartItemId 삭제 요청 시 404 반영됨")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.cartItems.erase(
        connection,
        {
          cartId: cart.id,
          cartItemId: fakeCartItemId,
        },
      );
    },
  );
}
