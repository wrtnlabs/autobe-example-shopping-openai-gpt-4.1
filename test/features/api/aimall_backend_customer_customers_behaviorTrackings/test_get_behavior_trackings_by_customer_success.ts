import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * 고객 행동 추적 조회 API의 정상 동작을 검증한다.
 *
 * - 시나리오 개요:
 *
 *   1. 신규 테스트 고객을 등록한다.
 *   2. 해당 고객 ID 소유로 login, view_product 등 두 개 이상의 행동 이벤트를 각각 등록한다.
 *   3. 등록된 고객의 ID로 행동 추적 조회 API를 호출한다.
 *   4. 응답 리스트에 등록된 모든 이벤트가 정확히 포함되어 있는지 event_type 기준으로 검증한다.
 *   5. 임의의 잘못된 고객 ID로 조회 시 권한 에러가 발생하는지 별도 검증한다.
 * - 비고:
 *
 *   - 실제 인증 세션은 생략(실제 환경에선 인증 구조 필요), 에러 메시지 등 상세 정책 검증은 미포함.
 *   - 생성 이벤트 필드(이벤트 타입, 발생시간, 데이터)만 검증, 상세 데이터 비교는 단순화함.
 *   - API 변화로 권한 정책 및 응답 구조 수정 시 본 테스트도 함께 업데이트 필요.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_get_behavior_trackings_by_customer_success(
  connection: api.IConnection,
) {
  // 1. 테스트 고객 생성 (이메일, 폰 번호는 중복 방지용 랜덤 값 적용)
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  const testPhone: string = `010${typia
    .random<
      number &
        tags.Type<"int32"> &
        tags.Minimum<10000000> &
        tags.Maximum<99999999>
    >()
    .toString()}`;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: testEmail,
        phone: testPhone,
        password_hash: "hash-for-test",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. 테스트 고객으로 이벤트 2건: login, view_product 등록
  const event1 =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "login",
          event_data: JSON.stringify({ ip: "127.0.0.1" }),
          occurred_at: new Date().toISOString(),
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(event1);
  const event2 =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "view_product",
          event_data: JSON.stringify({
            productId: "P-12345",
            referrer: "ad_campaign",
          }),
          occurred_at: new Date().toISOString(),
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(event2);

  // 3. 정상 API 호출: 고객 ID로 추적 데이터 조회
  const res =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(res);
  TestValidator.predicate("조회 내역 2개 이상")(res.data.length >= 2);
  const eventTypes = res.data.map((e) => e.event_type);
  TestValidator.predicate("login 이벤트 포함됨")(eventTypes.includes("login"));
  TestValidator.predicate("view_product 이벤트 포함됨")(
    eventTypes.includes("view_product"),
  );

  // 4. 임의의 잘못된 ID로 접근 시 권한 오류 반환 여부 확인
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 고객으로 조회시 오류")(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.index(
      connection,
      {
        customerId: randomUUID,
      },
    );
  });
}
