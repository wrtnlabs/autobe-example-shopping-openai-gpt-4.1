import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * 고객 자신의 주소 삭제 성공 케이스 e2e 테스트
 *
 * 시나리오:
 *
 * 1. 고객을 등록한다.
 * 2. 주소를 두 개 생성한다 (하나는 is_default: true, 하나는 false)
 * 3. 비-기본 주소를 삭제한다. 정상적으로 삭제되었음을 확인
 * 4. 기본 주소를 삭제 후, 남은 주소 및 기본주소 비즈니스 규칙(기본 주소 자동 승계 여부 등) 이상 무 여부 확인
 * 5. 추가 주소를 기본(default)으로 문제없이 생성되는지 확인 (참고: 별도의 전체 주소 조회/단건 조회 엔드포인트가 제공되지 않으므로,
 *    삭제 완료 후 재생성/기본 플래그 저장 성공 여부로 간접 검증)
 *
 * 검증 포인트:
 *
 * - 주소 삭제 시 별다른 에러 없이 작업이 완료된다 (즉, 정상적인 권한 조건 및 소유권 검사)
 * - 같은 customer_id로 새로운 주소 생성이 계속 가능하고, is_default 플래그 정상 작동함
 * - 기본 주소를 삭제하면 남은 주소/새로 추가되는 주소가 기본이 될 수 있음 (비즈니스 규칙 준수 간접적 검증)
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_customer_delete_own_address_success(
  connection: api.IConnection,
) {
  // 1. 고객 등록
  const customerInput = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. 기본주소/비기본 주소 생성
  const addrInput1 = {
    alias: "자택",
    recipient_name: "홍길동",
    phone: typia.random<string>(),
    address_line1: "서울특별시 서초구 강남대로 1",
    city: "서울",
    postal_code: "12345",
    country: "대한민국",
    is_default: true,
  } satisfies IAimallBackendAddress.ICreate;
  const address1 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addrInput1 },
    );
  typia.assert(address1);

  const addrInput2 = {
    alias: "회사",
    recipient_name: "홍길동",
    phone: typia.random<string>(),
    address_line1: "서울특별시 강남구 테헤란로 2",
    address_line2: "101동 202호",
    city: "서울",
    postal_code: "54321",
    country: "대한민국",
    is_default: false,
  } satisfies IAimallBackendAddress.ICreate;
  const address2 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addrInput2 },
    );
  typia.assert(address2);

  // 3. 두 번째(비-기본) 주소 삭제
  await api.functional.aimall_backend.customer.customers.addresses.erase(
    connection,
    { customerId: customer.id, addressId: address2.id },
  );
  // get/list가 없어 직접 조회 불가이므로, 추가 주소를 기본(default: false)로 등록이 정상적으로 되는지로 삭제 성공 간접검증
  const addrInput3 = {
    alias: "부모님 댁",
    recipient_name: "홍길동 부모",
    phone: typia.random<string>(),
    address_line1: "경기도 성남시 분당구 3",
    city: "성남",
    postal_code: "67890",
    country: "대한민국",
    is_default: false,
  } satisfies IAimallBackendAddress.ICreate;
  const address3 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addrInput3 },
    );
  typia.assert(address3);

  // 4. 첫 번째(기본) 주소 삭제 후, 남은 주소가 기본 승계 되는지 확인은 불가(조회 없으나, 삭제/생성 모두 성공해야 비즈니스 룰 무결성 간접 확인)
  await api.functional.aimall_backend.customer.customers.addresses.erase(
    connection,
    { customerId: customer.id, addressId: address1.id },
  );
  // 5. 새로운 주소 default 지정 생성 (default 폴백, 생성 모두 허용 되는지)
  const addrInput4 = {
    alias: "여행용 숙소",
    recipient_name: "여행객",
    phone: typia.random<string>(),
    address_line1: "부산광역시 해운대구 4",
    city: "부산",
    postal_code: "13579",
    country: "대한민국",
    is_default: true,
  } satisfies IAimallBackendAddress.ICreate;
  const address4 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addrInput4 },
    );
  typia.assert(address4);
  // 검증: 예외나 권한 에러 없이 모든 작업이 정상 처리(삭제, 생성, 기본주소지정 등)
}
