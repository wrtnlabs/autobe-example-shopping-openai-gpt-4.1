import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * 검증: 고객이 자신의 장바구니에서 존재하지 않는 cart item을 삭제 시도할 때 404 Not Found 에러를 반환한다.
 *
 * 본 테스트는 다음 시나리오를 검증합니다:
 *
 * 1. 인증 맥락을 위한 신규 고객 회원가입
 * 2. 해당 고객의 장바구니 생성
 * 3. 임의(실제로 존재하지 않는) cartItemId(UUID) 생성
 * 4. 위 cartId/임의 cartItemId 조합으로 장바구니 아이템 삭제(DELETE) 호출
 * 5. API가 404 Not Found 에러를 반환하는지 검증
 */
export async function test_api_aimall_backend_test_customer_deletes_nonexistent_cart_item_returns_404(
  connection: api.IConnection,
) {
  // 1. 신규 고객 생성(회원가입)
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. 고객 장바구니 생성
  const cartInput: IAimallBackendCart.ICreate = {
    aimall_backend_customer_id: customer.id,
  };
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: cartInput,
    },
  );
  typia.assert(cart);

  // 3. 존재하지 않는 cart item의 UUID를 생성 (실제 장바구니에 없는 값)
  const nonExistentCartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. 해당 cartId/임의 cartItemId로 삭제 요청 시 404 에러 검증
  await TestValidator.error("존재하지 않는 cartItemId 삭제시 404 에러 반환")(
    async () => {
      await api.functional.aimall_backend.customer.carts.cartItems.erase(
        connection,
        {
          cartId: cart.id,
          cartItemId: nonExistentCartItemId,
        },
      );
    },
  );
}
