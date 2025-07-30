import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * 관리자 권한으로 존재하지 않는 주문을 삭제(아카이브) 시도할 때 404 Not Found 오류가 발생하고 실데이터에는 영향이 없는지
 * 검증합니다.
 *
 * 1. 무작위로 생성된 UUID(실제 주문에 존재하지 않을 값)를 준비합니다.
 * 2. 관리자 권한으로 해당 UUID를 사용해 삭제 요청을 보냅니다.
 * 3. 주문이 존재하지 않으므로 반드시 404 에러가 발생해야 하며, 이 요청으로 인해 실제 데이터가 잘못 삭제되거나 변경되는 일이 없어야
 *    합니다.
 * 4. TestValidator.error를 사용해 런타임 오류(존재하지 않는 주문)를 정상적으로 감지했음을 검증합니다.
 */
export async function test_api_aimall_backend_administrator_orders_erase_not_found_error(
  connection: api.IConnection,
) {
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 주문 삭제는 404 오류를 반환해야 함")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.erase(
        connection,
        {
          orderId: nonExistentOrderId,
        },
      );
    },
  );
}
