import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * 고객이 본인 장바구니(cartId)를 삭제하는 엔드투엔드 테스트.
 *
 * 1. 고객용 장바구니를 생성한다. (POST /aimall-backend/customer/carts)
 * 2. 방금 생성한 cart의 UUID로 DELETE /aimall-backend/customer/carts/{cartId}를 호출하여 삭제한다.
 * 3. 삭제 이후 동일 customer_id로 장바구니를 재생성할 수 있음을 확인한다.
 *
 *    - Unique 제약 없는지 확인 (동일 customer_id로 재생성 정상동작)
 * 4. (현 시점 장바구니 개별 조회/삭제 후 존재확인 GET API가 없어 cascade 삭제 검증 불가)
 *
 * Note: cascade로 연관 cart_items도 함께 삭제되는 점은 스키마 및 API 설명에 근거하여 확인할 수 있음.
 */
export async function test_api_aimall_backend_customer_carts_test_delete_cart_by_owner_success(
  connection: api.IConnection,
) {
  // 1. 고객 장바구니 생성
  const createBody = {
    aimall_backend_customer_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IAimallBackendCart.ICreate;

  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    { body: createBody },
  );
  typia.assert(cart);

  // 2. 생성한 장바구니 삭제
  await api.functional.aimall_backend.customer.carts.erase(connection, {
    cartId: cart.id,
  });

  // 3. 삭제 후 동일 customer_id로 장바구니 재생성 - normal flow (unique 제약 없음)
  const cart2 = await api.functional.aimall_backend.customer.carts.create(
    connection,
    { body: createBody },
  );
  typia.assert(cart2);
}
