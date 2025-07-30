import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자(admin)가 고객의 주소 목록을 비정상적인 페이지네이션 값으로 조회하는 API 동작을 검증합니다.
 *
 * - 신규 고객 등록
 * - 해당 고객에게 여러개의 배송지 주소를 등록
 * - 등록된 주소 개수보다 더 큰 페이지 번호/limit 조합으로 검색 요청
 * - 반환된 address data array가 비어있고, pagination의 레코드/페이지 정보가 정확한지 확인
 *
 * 비 성공 케이스: 존재하지 않는 페이지(예: page > 마지막 페이지) 요청 시 데이터가 비어야 하며, pagination의 total
 * records, total pages가 실제 등록 주소 수와 일치해야 합니다. 또한, 더 이상 페이징이 불가함을 current,
 * limit, pages 값으로 명확히 알 수 있어야 합니다
 *
 * 1. 고객 생성 (POST /aimall-backend/customers)
 * 2. (관리자) 고객에게 여러 개(3개 이상 추천) 주소 등록 (POST
 *    /aimall-backend/administrator/customers/{customerId}/addresses)
 * 3. (관리자) '실제 존재하는 주소 수'보다 더 큰 page 값을 전달하여 검색 (PATCH
 *    /aimall-backend/administrator/customers/{customerId}/addresses) - 예: 만약 3개
 *    등록했다면 page 10으로 limit 2로 검색
 * 4. 반환값의 data는 비어있고, pagination 정보에 records(총 등록수), pages(총 페이지수), current(요청
 *    페이지번호), limit(요청 limit)이 부합하는지 검증
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_search_addresses_with_invalid_pagination(
  connection: api.IConnection,
) {
  // 1. 고객 생성
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. 해당 고객에게 주소 여러개 등록 (3개)
  const addressCount = 3;
  const addresses = [];
  for (let i = 0; i < addressCount; ++i) {
    const address =
      await api.functional.aimall_backend.administrator.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body: {
            alias: `Test${i + 1}`,
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            address_line1: RandomGenerator.paragraph()(),
            city: "Seoul",
            postal_code: "12345",
            country: "South Korea",
            is_default: i === 0,
          } satisfies IAimallBackendAddress.ICreate,
        },
      );
    addresses.push(address);
    typia.assert(address);
  }

  // 3. addressCount보다 더 큰 페이지값으로 검색 (예: page=10, limit=2)
  const page = 10;
  const limit = 2;
  const result =
    await api.functional.aimall_backend.administrator.customers.addresses.search(
      connection,
      {
        customerId: customer.id,
        body: {
          page,
          limit,
        } satisfies IAimallBackendAddress.IRequest,
      },
    );
  typia.assert(result);

  // 4. 반환된 address data는 빈 배열, pagination 정보가 전체 주소 개수 및 페이징 정보와 일치하는지 검증
  TestValidator.equals("no addresses when page out of range")(result.data)([]);
  TestValidator.equals("pagination.records == addressCount")(
    result.pagination.records,
  )(addressCount);
  TestValidator.equals("pagination.limit == limit")(result.pagination.limit)(
    limit,
  );
  TestValidator.equals("pagination.current == page")(result.pagination.current)(
    page,
  );
  // 실제 전체 페이지 계산
  const expectedPages = Math.ceil(addressCount / limit);
  TestValidator.equals("pagination.pages == expectedPages")(
    result.pagination.pages,
  )(expectedPages);
}
