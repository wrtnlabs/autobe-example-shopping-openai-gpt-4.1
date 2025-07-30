import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * 관리자(admin)가 이미 다른 장바구니에 사용 중인 session_token 값으로 타 장바구니의 session_token을 갱신시키려
 * 할 때, 고유성(unique constraint) 위반에 따라 업데이트가 정상적으로 거부(에러 발생)되는지 검증합니다.
 *
 * 실제 현업에서는 비회원 장바구니 병합, 세션교체 등의 기능에서 session_token 중복으로 인해 장애가 발생할 수 있으므로, 본
 * 테스트는 시스템이 session_token의 유일성을 안전하게 보장하는지 확인하는 데 목적이 있습니다.
 *
 * 1. 임의의 alphaNumeric(24글자) session_token_A, session_token_B 준비
 * 2. Session_token_A로 첫 번째(비회원) 장바구니 생성
 * 3. Session_token_B로 두 번째(비회원) 장바구니 생성
 * 4. 두 번째 장바구니의 session_token을 session_token_A로 강제로 업데이트(중복 유발) 시도
 *
 *    - 시스템은 중복 session_token 허용 불가이므로 에러(HttpError 등) 발생 필수
 *    - 정상 동작 시, 두 번째 장바구니의 session_token은 기존대로 유지되어야 함
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_update_cart_with_duplicate_session_token_should_fail(
  connection: api.IConnection,
) {
  // 1. session_token_A, session_token_B (길이 24, alphaNumeric) 준비
  const session_token_A = RandomGenerator.alphaNumeric(24);
  const session_token_B = RandomGenerator.alphaNumeric(24);

  // 2. 첫 번째 장바구니 생성 (session_token_A)
  const cartA = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        session_token: session_token_A,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cartA);

  // 3. 두 번째 장바구니 생성 (session_token_B)
  const cartB = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        session_token: session_token_B,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cartB);

  // 4. 두 번째(cartB) session_token을 session_token_A로 덮어쓰는 업데이트 시도 → 고유성 오류 필수
  await TestValidator.error("session_token 중복 처리 오류")(async () => {
    await api.functional.aimall_backend.administrator.carts.update(connection, {
      cartId: cartB.id,
      body: {
        session_token: session_token_A,
        updated_at: new Date().toISOString(),
      } satisfies IAimallBackendCart.IUpdate,
    });
  });
}
