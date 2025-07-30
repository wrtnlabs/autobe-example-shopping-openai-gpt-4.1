import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * 관리자 권한으로 장바구니 메타데이터(session_token, updated_at) 변경 성공을 검증하는 테스트
 *
 * - 관리자는 임의 장바구니(cartId 기반)의 session_token, updated_at 필드를 자유롭게 수정할 수 있다.
 * - 업데이트가 성공적으로 이뤄지고, 응답 및 기록이 정상적으로 반영되어야 한다.
 * - Session_token의 유일성 비즈니스 규칙도 기본 성공 케이스 내에서 자연스럽게 검증된다.
 * - 감사 로그 등 시스템적 미노출 항목은 외부에서 검증 불가하므로 제외
 *
 * [테스트 절차]
 *
 * 1. 관리자 권한으로 임의 session_token을 가진 장바구니 생성
 * 2. 새로운 session_token 및 현재 시각 updated_at으로 해당 장바구니 update
 * 3. 응답의 session_token/updated_at 필드가 입력값으로 실제 반영되었는지 검증
 * 4. 불변 필드(id 등) 및 cart_items_count 등 주요 데이터 일관성 확인
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_update_cart_for_any_customer_success(
  connection: api.IConnection,
) {
  // 1. 관리자 권한으로 장바구니를 생성 (게스트 세션장바구니로 세션토큰 부여)
  const baseSessionToken = RandomGenerator.alphaNumeric(16);
  const createdCart =
    await api.functional.aimall_backend.administrator.carts.create(connection, {
      body: {
        session_token: baseSessionToken,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(createdCart);

  // 2. 새 session_token 및 updated_at 값으로 update 요청
  const newSessionToken = RandomGenerator.alphaNumeric(20);
  const newUpdatedAt = new Date().toISOString();
  const updatedCart =
    await api.functional.aimall_backend.administrator.carts.update(connection, {
      cartId: createdCart.id,
      body: {
        session_token: newSessionToken,
        updated_at: newUpdatedAt,
      } satisfies IAimallBackendCart.IUpdate,
    });
  typia.assert(updatedCart);

  // 3. 입력값 반영 확인 (session_token/updated_at)
  TestValidator.equals("session_token 변경 확인")(updatedCart.session_token)(
    newSessionToken,
  );
  TestValidator.equals("updated_at 갱신 확인")(updatedCart.updated_at)(
    newUpdatedAt,
  );

  // 4. 불변 필드/항목 일관성 검증
  TestValidator.equals("장바구니 id불변성")(updatedCart.id)(createdCart.id);
  TestValidator.equals("cart_items_count 불변성")(updatedCart.cart_items_count)(
    createdCart.cart_items_count,
  );
}
