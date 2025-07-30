import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 커뮤니티 게시글 검색, 필터링, 페이징에 대한 end-to-end 검증 함수
 *
 * 비즈니스 목적: 게시판, Q&A 등 다양한 커뮤니티 영역에서 고도화된 검색/필터/페이징 기능이 정상 작동하는지 테스트합니다.
 * 관리자/셀러/고객의 다양한 조건 게시글을 생성 후, 검색 조건별로 기대한 데이터만 반환되는지/불일치 데이터가 섞이지 않는지 및
 * pagination 메타데이터가 정확한지 검증합니다.
 *
 * 테스트 단계:
 *
 * 1. 고객/판매자/관리자 권한으로 각각 구별 가능한 게시글을 생성합니다 (title/body/is_private 조합 다양)
 * 2. 각 필터(customer_id, title 키워드, is_private, 생성일 범위 등)별 게시글 검색 결과에 대해 모두 조건 일치 여부
 *    확인
 * 3. 페이징(page, limit) 검색 결과/메타데이터가 올바른지 검증
 */
export async function test_api_aimall_backend_test_search_community_posts_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. 고객, 판매자, 관리자 권한 각각 테스트용 게시글 생성
  // 고객 - 공개글
  const customerPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: "고객 검색특화 제목!@#",
        body: "검색 전용 고객 본문!@#",
        is_private: false,
      },
    });
  typia.assert(customerPost);

  // 고객 - 비공개글
  const customerPrivate =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: "비공개 고객글",
        body: "private customer post",
        is_private: true,
      },
    });
  typia.assert(customerPrivate);

  // 셀러 - 검색 대비 고유 제목
  const sellerPost = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: "셀러 특화 검색제목",
        body: "판매자 본문 내용",
        is_private: false,
      },
    },
  );
  typia.assert(sellerPost);

  // 관리자 - 고유 타이틀
  const adminPost =
    await api.functional.aimall_backend.administrator.posts.create(connection, {
      body: {
        title: "관리자만 아는 제목",
        body: "admin only content",
        is_private: false,
      },
    });
  typia.assert(adminPost);

  // 날짜 필터용: 생성 시각 보관
  const dateFrom = customerPost.created_at;
  const dateTo = adminPost.created_at;

  // 2. author(customer_id) 검색
  const byCustomer = await api.functional.aimall_backend.posts.search(
    connection,
    {
      body: {
        customer_id: customerPost.customer_id ?? null,
      },
    },
  );
  typia.assert(byCustomer);
  TestValidator.predicate("customer_id로 검색: 모두 동일 author")(
    byCustomer.data.every(
      (post) => post.customer_id === customerPost.customer_id,
    ),
  );

  // 3. title 키워드
  const byTitle = await api.functional.aimall_backend.posts.search(connection, {
    body: {
      title: "관리자만",
    },
  });
  typia.assert(byTitle);
  TestValidator.predicate("제목 내 키워드 필터")(
    byTitle.data.every((post) => post.title.includes("관리자만")),
  );

  // 4. is_private 필터
  const byPrivate = await api.functional.aimall_backend.posts.search(
    connection,
    {
      body: {
        is_private: true,
      },
    },
  );
  typia.assert(byPrivate);
  TestValidator.predicate("모든 게시물이 is_private true")(
    byPrivate.data.every((post) => post.is_private === true),
  );

  // 5. 생성일 기간 필터
  const byDateRange = await api.functional.aimall_backend.posts.search(
    connection,
    {
      body: {
        created_at_from: dateFrom,
        created_at_to: dateTo,
      },
    },
  );
  typia.assert(byDateRange);
  TestValidator.predicate("기간 필터 내 생성")(
    byDateRange.data.every(
      (post) => post.created_at >= dateFrom && post.created_at <= dateTo,
    ),
  );

  // 6. Pagination: limit/page에 따라 일부만 반환, pagination 메타 확인
  const paged = await api.functional.aimall_backend.posts.search(connection, {
    body: {
      limit: 2,
      page: 1,
    },
  });
  typia.assert(paged);
  TestValidator.equals("페이지당 2개 반환")(paged.data.length)(2);
  TestValidator.equals("pagination.limit 일치")(paged.pagination.limit)(2);
  TestValidator.equals("현재 page=1 일치")(paged.pagination.current)(1);
  TestValidator.predicate("pagination.records >= 2, 게시물 2개 이상 존재")(
    paged.pagination.records >= 2,
  );
}
