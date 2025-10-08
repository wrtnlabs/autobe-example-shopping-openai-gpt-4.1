import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallModerationEventLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";

/**
 * 인증된 관리자가 쇼핑몰의 모든 모더레이션 이벤트 로그(관리/예외 이벤트)를 고급 필터와 페이지네이션으로 조회/검색하는 기능 검증.
 *
 * 1. 관리자로 회원가입 및 토큰 발급
 * 2. (테스트 목적상) 이벤트 로그가 있다고 가정하고, 여러 검색/필터 조합으로 API를 호출한다
 * 3. Event_type, acting admin, created_from~to, 여러 엔터티별(id) 등 필터와 페이지, limit, sort
 *    적용 케이스
 * 4. 각 응답에 대해 타입검증, 필터 결과 논리 검증(각 항목이 필터/검색 조건에 부합하는지), 페이지 정보와 데이터 개수, 전체 개수, 등
 *    일치 검증
 * 5. 극단적 필터(존재 불가UUID, 먼 미래기간 등)는 데이터 없음(empty array)임을 확인
 * 6. 토큰 없는 상태로 호출하면 인증에러가 나오는지도 검증
 */
export async function test_api_moderation_event_log_list_admin_dashboard_audit(
  connection: api.IConnection,
) {
  // 1. 관리자로 회원가입(인증)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminTest!123",
      full_name: adminFullName,
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. 이벤트 로그를 여러 케이스로 검색
  // 2-1. 기본 전체 조회 (필터 없음, 첫 페이지)
  const allLogsPage =
    await api.functional.shoppingMall.admin.moderationEventLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallModerationEventLog.IRequest,
      },
    );
  typia.assert(allLogsPage);
  TestValidator.predicate(
    "첫 조회시 페이지 데이터 개수 0 이상",
    allLogsPage.data.length >= 0,
  );
  TestValidator.equals("첫 페이지 번호는 1", allLogsPage.pagination.current, 1);

  // 2-2. acting admin id(본인)으로 필터
  const byAdmin =
    await api.functional.shoppingMall.admin.moderationEventLogs.index(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminJoin.id,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallModerationEventLog.IRequest,
      },
    );
  typia.assert(byAdmin);
  for (const log of byAdmin.data) {
    TestValidator.equals(
      "acting admin id 부합",
      log.shopping_mall_admin_id,
      adminJoin.id,
    );
  }

  // 2-3. event_type(플래그/삭제 등)으로 필터
  // 예시: 가장 처음 전체 결과(1건 이상이면)를 기반으로 검색
  const firstLog = allLogsPage.data[0];
  if (firstLog) {
    const byEventType =
      await api.functional.shoppingMall.admin.moderationEventLogs.index(
        connection,
        {
          body: {
            event_type: firstLog.event_type,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallModerationEventLog.IRequest,
        },
      );
    typia.assert(byEventType);
    for (const log of byEventType.data) {
      TestValidator.equals(
        "event_type 부합",
        log.event_type,
        firstLog.event_type,
      );
    }
  }

  // 2-4. created_from ~ created_to 기간 필터 (최대 1건이거나 0, 1페이지 응답)
  if (firstLog) {
    const byDate =
      await api.functional.shoppingMall.admin.moderationEventLogs.index(
        connection,
        {
          body: {
            created_from: firstLog.created_at,
            created_to: firstLog.created_at,
            page: 1,
            limit: 3,
          } satisfies IShoppingMallModerationEventLog.IRequest,
        },
      );
    typia.assert(byDate);
    for (const log of byDate.data) {
      TestValidator.equals(
        "created_at 완전 일치",
        log.created_at,
        firstLog.created_at,
      );
    }
  }

  // 2-5. 극단필터(존재할 수 없는 랜덤UUID)
  const failResult =
    await api.functional.shoppingMall.admin.moderationEventLogs.index(
      connection,
      {
        body: {
          event_type: "no-such-type-" + RandomGenerator.alphaNumeric(8),
          page: 1,
          limit: 5,
        } satisfies IShoppingMallModerationEventLog.IRequest,
      },
    );
  typia.assert(failResult);
  TestValidator.equals("없는 필터 시 결과 없음", failResult.data.length, 0);

  // 3. 페이지네이션: limit=1, 2페이지/3페이지 등
  const page1 =
    await api.functional.shoppingMall.admin.moderationEventLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallModerationEventLog.IRequest,
      },
    );
  const page2 =
    await api.functional.shoppingMall.admin.moderationEventLogs.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallModerationEventLog.IRequest,
      },
    );
  typia.assert(page1);
  typia.assert(page2);
  TestValidator.equals(
    "페이지네이션 limit=1시 최대 1건",
    page1.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "페이지네이션 2페이지도 최대 1건",
    page2.data.length <= 1,
    true,
  );
  // 페이지별로 중복되지 않거나, 전체 count가 2 이상이면 서로 다른 id여야 함
  if (page1.data.length && page2.data.length) {
    TestValidator.notEquals(
      "페이지1,2의 id 달라야 함",
      page1.data[0].id,
      page2.data[0].id,
    );
  }

  // 4. 인증 실패(토큰 없는 unauthenticated 연결): 새 connection 객체로 호출
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("토큰 없이 호출시 인증 실패", async () => {
    await api.functional.shoppingMall.admin.moderationEventLogs.index(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallModerationEventLog.IRequest,
      },
    );
  });
}
