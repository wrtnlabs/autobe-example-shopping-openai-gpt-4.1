import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * 고객별 신규 장바구니 생성 및 중복 제약 검증 E2E
 *
 * 이 테스트는 -- (1) 아직 활성화된 장바구니가 없는 신규 고객(aimall_backend_customer_id)을 대상으로, (2)
 * 최초 장바구니 생성 요청 시 모든 필드가 정상적으로 할당·반환되는지, (3) 같은 고객 UUID로 두번째 장바구니 생성 시 중복
 * 제약(UNIQUE)이 제대로 동작해 에러가 나는지 검증합니다.
 *
 * # 시나리오/절차
 *
 * 1. 랜덤 uuid 형식의 고객 ID (aimall_backend_customer_id) 생성
 * 2. /aimall-backend/customer/carts POST로 신규 장바구니 생성
 *
 * - 응답: id(uuid), 고객ID, 생성일시 값과 포맷 체크
 *
 * 3. 동일 고객ID로 두번째 장바구니 추가 생성 시도 → 에러(중복 제약 발동) 발생
 */
export async function test_api_aimall_backend_customer_carts_test_create_cart_for_new_customer_session_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 신규 고객 UUID 생성
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 2. 장바구니 최초 생성 요청
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerId,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // (2-1) 반환 객체의 고객 UUID 일치
  TestValidator.equals("장바구니 고객ID 일치")(cart.aimall_backend_customer_id)(
    customerId,
  );
  // (2-2) 카트 ID 포맷(uuid) 체크
  TestValidator.predicate("장바구니 id(uuid) 포맷")(
    typeof cart.id === "string" && /[0-9a-fA-F-]{36}/.test(cart.id),
  );
  // (2-3) 생성일시가 ISO8601 date-time 형식인지
  TestValidator.predicate("생성일시 포맷(date-time)")(
    typeof cart.created_at === "string" && !isNaN(Date.parse(cart.created_at)),
  );

  // 3. 동일 고객ID로 두번째 장바구니 생성 시도(중복 제약 확인용)
  await TestValidator.error("중복 고객ID로 장바구니 생성 불가")(async () => {
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customerId,
      } satisfies IAimallBackendCart.ICreate,
    });
  });
}
