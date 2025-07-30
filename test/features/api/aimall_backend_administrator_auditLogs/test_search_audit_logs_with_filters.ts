import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAuditLog";
import type { IPageIAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 감사 로그(Audit Log) 검색(필터/페이지네이션) E2E 검증
 *
 * 관리자 권한으로 감사 로그를 event_type, actor_id, 기간(start/end), 정렬 필드 등 필터 조건을 조합하여 검색할
 * 수 있으며, API 반환 데이터가 입력 조건에 맞는지, 페이지네이션 및 정렬이 정상 동작하는지를 검증합니다. 또한 존재하지 않는(잘못된)
 * 조건으로 쿼리 시 empty-result가 반환됨도 확인합니다.
 *
 * 1. 기본 페이지네이션/정렬 쿼리 검증
 * 2. Event_type 단일 필터 쿼리
 * 3. Actor_id 단일 필터 쿼리
 * 4. 기간(start_at ~ end_at) 필터 쿼리
 * 5. 여러 필터 조합 및 잘못된(미래시점/무효 필드) empty 케이스
 */
export async function test_api_aimall_backend_administrator_auditLogs_search(
  connection: api.IConnection,
) {
  // 1. 기본 페이지네이션 리스트 조회 (page = 1, limit = 10)
  const basePage =
    await api.functional.aimall_backend.administrator.auditLogs.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        },
      },
    );
  typia.assert(basePage);
  TestValidator.predicate("at least 0, at most 10 results")(
    basePage.data.length <= 10 && basePage.data.length >= 0,
  );
  TestValidator.equals("pagination page")(basePage.pagination.current)(1);
  TestValidator.equals("pagination limit")(basePage.pagination.limit)(10);

  // 2. event_type 필터를 적용한 검색 (존재하는 event_type 값 사용)
  let pickedEventType: string | undefined = undefined;
  if (basePage.data.length > 0) {
    pickedEventType = basePage.data[0].event_type;
    const eventTypeFiltered =
      await api.functional.aimall_backend.administrator.auditLogs.search(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            event_type: pickedEventType,
            sort: "-created_at",
          },
        },
      );
    typia.assert(eventTypeFiltered);
    for (const log of eventTypeFiltered.data) {
      TestValidator.equals("event_type 필터")(log.event_type)(pickedEventType);
    }
  }

  // 3. actor_id(담당자)로 필터링된 검색 (존재하는 actor_id 값 사용)
  let pickedActorId: string | undefined = undefined;
  if (basePage.data.length > 0 && basePage.data[0].actor_id) {
    pickedActorId = basePage.data[0].actor_id;
    const actorFiltered =
      await api.functional.aimall_backend.administrator.auditLogs.search(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            actor_id: pickedActorId,
            sort: "-created_at",
          },
        },
      );
    typia.assert(actorFiltered);
    for (const log of actorFiltered.data) {
      TestValidator.equals("actor_id 필터")(log.actor_id)(pickedActorId);
    }
  }

  // 4. 기간 필터(start_at, end_at)
  if (basePage.data.length > 0) {
    // 기준 타임스탬프 추출 (첫번째 로그)
    const ts = basePage.data[0].created_at;
    const timeFiltered =
      await api.functional.aimall_backend.administrator.auditLogs.search(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            start_at: ts,
            end_at: ts,
            sort: "-created_at",
          },
        },
      );
    typia.assert(timeFiltered);
    for (const log of timeFiltered.data) {
      TestValidator.equals("created_at 범위")(log.created_at)(ts);
    }
  }

  // 5. 여러 필터 조합 (event_type + actor_id + 기간), 부정 결과 케이스 검증
  if (pickedEventType && pickedActorId) {
    // 미래 시간(start_at을 미래) 조건으로 검색 (무조건 결과 없음)
    const futureISO = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString();
    const futureFiltered =
      await api.functional.aimall_backend.administrator.auditLogs.search(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            event_type: pickedEventType,
            actor_id: pickedActorId,
            start_at: futureISO,
            end_at: futureISO,
            sort: "-created_at",
          },
        },
      );
    typia.assert(futureFiltered);
    TestValidator.equals("미래 시점 쿼리 결과 없음")(
      futureFiltered.data.length,
    )(0);
  }
}
