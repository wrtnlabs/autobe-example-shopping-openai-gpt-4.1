import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * 관리자 입장에서 존재하지 않는 addressId로 특정 customerId의 주소를 조회할 때 오류 처리를 검증합니다.
 *
 * 이 테스트는 비정상 케이스(404 Not Found) 발생 시 동작을 확인하기 위해 설계되었습니다.
 *
 * [테스트 흐름]
 *
 * 1. 신규 고객을 생성해 유효한 customerId를 확보합니다.
 * 2. (시스템에 없는) 무작위 addressId를 생성합니다.
 * 3. 관리자 API로 customerId + 존재하지 않는 addressId로 주소 조회를 시도합니다.
 * 4. 404 Not Found와 같은 오류가 반드시 발생하는지 TestValidator.error로 검증합니다.
 * 5. 예외 발생 시, 민감한 실제 주소 데이터가 응답에 노출되지 않는 점도 간접적으로 보장합니다.
 *
 * - 실제 데이터 노출 여부에 대한 상세 검증은 TestValidator.error가 예외 발생만 확인하므로, 추가적 데이터 노출 검증은 구현
 *   API의 보안 정책 및 시스템 구조에 따라 확장 필요합니다.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_get_address_nonexistent_addressId(
  connection: api.IConnection,
) {
  // 1. 신규 고객 생성(테스트에 사용할 customerId 확보)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. 존재하지 않는 addressId 생성 (유효 uuid 형식이지만 DB에 존재하지 않음)
  const nonexistentAddressId = typia.random<string & tags.Format<"uuid">>();

  // 3-5. 관리자 권한으로 해당 customerId + non-existent addressId로 주소 단건 조회 시도
  await TestValidator.error("존재하지 않는 주소 ID 조회는 404 오류 발생")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.addresses.at(
        connection,
        {
          customerId: customer.id,
          addressId: nonexistentAddressId,
        },
      );
    },
  );
}
