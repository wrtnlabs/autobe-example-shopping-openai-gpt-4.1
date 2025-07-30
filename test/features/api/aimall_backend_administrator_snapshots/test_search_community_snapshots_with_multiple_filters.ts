import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 커뮤니티 스냅샷 목록 필터/검색 API 테스트 (복수 필터, 페이징, 예외상황)
 *
 * 어드민이 커뮤니티/상품/고객별 스냅샷 미디어 리뷰 혹은 모더레이션 함수로써, product_id, customer_id, media_uri
 * 키워드, 기간(created_from/to) 등 고급 조건을 조합해 스냅샷들을 페이징 검색한다. 반환 결과는 모든 필터를 엄격히 만족해야
 * 하며, 페이징 메타데이터가 있고 필터 조건 밖의 데이터는 포함되지 않는다. 불일치 필터나 비정상 파라미터시 빈 목록/실패를, 인증 누락시
 * 권한에러가 리턴되어야 한다.
 *
 * 1. 정상: product_id, customer_id, media_uri, 날짜범위 등 복합 필터로 검색 후 반환 결과가 모두 조건과
 *    일치하는지 검증 (pagination 포함)
 * 2. 정상: 일부만 필터(미디어, 기간만) 검색 case
 * 3. 정상: 무의미 필터/불일치(completely random) – 빈 data 반환됨을 검증
 * 4. 실패: invalid UUID, 음수 paging 등 잘못된 파라미터 적입시 에러
 * 5. 실패: 인증 누락(Authorization 없이)시 접근거부 오류
 */
export async function test_api_aimall_backend_administrator_snapshots_search(
  connection: api.IConnection,
) {
  // 1. 정상 multi-filtered 검색
  const validProductId = typia.random<string & tags.Format<"uuid">>();
  const validCustomerId = typia.random<string & tags.Format<"uuid">>();
  const validMediaUriKeyword = "part-of-media-uri";
  const validFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1주일 전
  const validTo = new Date().toISOString();

  const resp =
    await api.functional.aimall_backend.administrator.snapshots.search(
      connection,
      {
        body: {
          product_id: validProductId,
          customer_id: validCustomerId,
          media_uri: validMediaUriKeyword,
          created_from: validFrom,
          created_to: validTo,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(resp);
  TestValidator.predicate("pagination present")(
    !!resp.pagination && typeof resp.pagination.current === "number",
  );
  if (Array.isArray(resp.data) && resp.data.length > 0) {
    for (const snapshot of resp.data) {
      if (snapshot.product_id)
        TestValidator.equals("product filter")(snapshot.product_id)(
          validProductId,
        );
      if (snapshot.customer_id)
        TestValidator.equals("customer filter")(snapshot.customer_id)(
          validCustomerId,
        );
      TestValidator.predicate("media_uri keyword match")(
        snapshot.media_uri.includes(validMediaUriKeyword),
      );
      TestValidator.predicate("date range")(
        new Date(snapshot.created_at) >= new Date(validFrom) &&
          new Date(snapshot.created_at) <= new Date(validTo),
      );
    }
  }

  // 2. partial filters (media_uri, 기간만)
  const partialResp =
    await api.functional.aimall_backend.administrator.snapshots.search(
      connection,
      {
        body: {
          media_uri: validMediaUriKeyword,
          created_from: validFrom,
          created_to: validTo,
          page: 1,
          limit: 5,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(partialResp);
  for (const snap of partialResp.data ?? []) {
    TestValidator.predicate("media_uri keyword match [partial]")(
      snap.media_uri.includes(validMediaUriKeyword),
    );
    TestValidator.predicate("date range [partial]")(
      new Date(snap.created_at) >= new Date(validFrom) &&
        new Date(snap.created_at) <= new Date(validTo),
    );
  }

  // 3. 무의미/불일치 필터–빈 결과
  const noMatchResp =
    await api.functional.aimall_backend.administrator.snapshots.search(
      connection,
      {
        body: {
          product_id: "00000000-0000-4000-8000-000000000000",
          customer_id: "11111111-1111-4111-8111-111111111111",
          media_uri: "nonexistent-media",
          created_from: new Date(2000, 0, 1).toISOString(),
          created_to: new Date(2000, 0, 2).toISOString(),
          page: 2,
          limit: 3,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(noMatchResp);
  TestValidator.equals("empty data for unmatched filters")(noMatchResp.data)(
    [],
  );

  // 4. 잘못된 입력 값(형식, 음수)
  await TestValidator.error("invalid uuid filter")(() =>
    api.functional.aimall_backend.administrator.snapshots.search(connection, {
      body: {
        product_id: "not-a-uuid",
        page: -1,
        limit: -99,
      } as IAimallBackendSnapshot.IRequest,
    }),
  );

  // 5. 인증 없는 경우(권한 오류)
  if (connection.headers?.Authorization) {
    // Fix: Properly clone connection and delete Authorization field from headers
    const unprivilegedConnection = {
      ...connection,
      headers: { ...connection.headers },
    };
    delete unprivilegedConnection.headers.Authorization;
    await TestValidator.error("unauthorized no-token")(() =>
      api.functional.aimall_backend.administrator.snapshots.search(
        unprivilegedConnection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IAimallBackendSnapshot.IRequest,
        },
      ),
    );
  }
}
