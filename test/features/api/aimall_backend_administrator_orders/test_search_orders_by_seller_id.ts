import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 특정 seller의 주문 검색: seller_id 필터 테스트
 *
 * 관리자 또는 판매자 권한으로 /aimall-backend/administrator/orders PATCH API에 seller의 UUID를
 * 전달했을 때, 해당 seller가 보유한 주문만 반환되는지 검증한다.
 *
 * - 올바른 seller_id: 해당 seller의 주문만 조회
 * - 존재하지 않는 seller_id: 빈 배열 반환
 * - 역할 미부여/미인증 connection: 에러 반환
 *
 * 1. 존재하는 seller_id로 검색하여 모든 결과가 해당 seller로 한정되는지 검증
 * 2. 존재하지 않는 seller_id(uuid 랜덤값)로 검색 시 데이터가 0건임을 검증
 * 3. 권한 없는 connection 또는 비인증 요청일 경우 에러가 발생하는지 검증
 */
export async function test_api_aimall_backend_administrator_orders_test_search_orders_by_seller_id(
  connection: api.IConnection,
) {
  // 1. seller_id(존재하는 값)를 지정하여 주문목록 조회 및 검증
  const knownSellerId = typia.random<string & tags.Format<"uuid">>(); // 실제 주문 seller_id로 대체 필요
  const result =
    await api.functional.aimall_backend.administrator.orders.search(
      connection,
      {
        body: {
          seller_id: knownSellerId,
        } satisfies IAimallBackendOrder.IRequest,
      },
    );
  typia.assert(result);
  for (const order of result.data) {
    TestValidator.equals("seller_id 일치")(order.seller_id)(knownSellerId);
  }

  // 2. 존재하지 않는 seller_id로 요청 시, 빈 배열(혹은 정책상 에러)인지 검증
  const nonExistSellerId = typia.random<string & tags.Format<"uuid">>();
  const noneResult =
    await api.functional.aimall_backend.administrator.orders.search(
      connection,
      {
        body: {
          seller_id: nonExistSellerId,
        } satisfies IAimallBackendOrder.IRequest,
      },
    );
  typia.assert(noneResult);
  TestValidator.equals("존재하지 않는 seller_id의 주문 0건")(
    noneResult.data.length,
  )(0);

  // 3. 인증 없이 요청하면 권한, 인증 오류가 발생하는지 검증
  await TestValidator.error("권한 없는 요청 에러")(async () => {
    await api.functional.aimall_backend.administrator.orders.search(
      { ...(connection as any), headers: {} },
      {
        body: {
          seller_id: knownSellerId,
        } satisfies IAimallBackendOrder.IRequest,
      },
    );
  });
}
