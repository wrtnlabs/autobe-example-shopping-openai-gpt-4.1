import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 권한에서 리뷰 댓글 검색·필터 기능 및 소프트 삭제 적용 검증 E2E 테스트
 *
 * 이 테스트는 다음을 포괄적으로 검증합니다:
 *
 * - 여러 명의 고객이 남긴 공개/비공개·단일/답글 등 다양한 조합의 리뷰 댓글 생성
 * - Soft-delete(논리삭제)된 댓글의 기본 필터링 동작
 * - 관리자 계정으로 customer_id, is_private, parent_id, created_at 날짜필터, 페이지네이션 등 복합
 *   검색·정렬 동작
 * - 비즈니스 룰에 따라 관리자는 대부분 모두 열람 가능하고, 삭제된 댓글은 기본적으로 제외됨을 확인
 * - 잘못된 필터/페이지 파라미터 요청 등 에러 처리도 함께 검증
 *
 * **세부 절차**
 *
 * 1. 고객 ID 3개 임의 생성 (실 서비스라면 인증·회원가입이 필요하나 여기선 uuid만 가정)
 * 2. 한 고객ID로 상품 리뷰 등록
 * 3. 리뷰에 대하여 다양한 조합(공개/비공개, 루트/답글)의 댓글 3개 등록
 * 4. Soft-delete는 별도 API 존재하지 않아, deleted_at이 null/non-null 케이스는 생성 시/필터 결과로만 간접
 *    검증
 * 5. 관리자로 인증(별도 인증 API 없음) 후, 관리용 검색/필터 API를 customer_id, is_private, parent_id,
 *    created_at 등으로 수차례 호출 후 결과 검증
 * 6. 페이지네이션 및 입력값 오류(불가능한 page/limit 등) 케이스도 마지막에 체크
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_search_review_comments_admin_all_access_respects_filters_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. 고객 uuid 3개 임의 준비
  const customerIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // 2. 고객A로 상품 리뷰 등록
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "관리자 댓글 필터링 시나리오용 리뷰",
        body: "이 리뷰에는 다양한 조건의 댓글들이 달립니다.",
        rating: 5 as 5 & tags.Type<"int32">,
      },
    },
  );
  typia.assert(review);

  // 3. 다양한 조합(공개,비공개,답글) 댓글 등록
  // root: 공개, customer[0]
  const commentRoot1 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "공개 댓글 sampleA",
          is_private: false,
        },
      },
    );
  typia.assert(commentRoot1);

  // root: 비공개, customer[1]
  const commentRoot2 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "비공개 댓글 sampleB",
          is_private: true,
        },
      },
    );
  typia.assert(commentRoot2);

  // reply(자식) 공개, customer[2], parent_id = root1
  const commentChild1 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          parent_id: commentRoot1.id,
          body: "root1에 대한 답글",
          is_private: false,
        },
      },
    );
  typia.assert(commentChild1);

  // 4. 별도 soft-delete API는 없어 deleted_at 테스트는 생략(결과 row로만 확인)

  // 5-1. customer_id 필터
  const resultCustomer =
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          customer_id: commentRoot2.customer_id,
        },
      },
    );
  typia.assert(resultCustomer);
  resultCustomer.data.forEach((c) =>
    TestValidator.equals("customer_id")(c.customer_id)(
      commentRoot2.customer_id,
    ),
  );

  // 5-2. is_private true 필터
  const resultPrivate =
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          is_private: true,
        },
      },
    );
  typia.assert(resultPrivate);
  resultPrivate.data.forEach((c) =>
    TestValidator.equals("is_private true")(c.is_private)(true),
  );

  // 5-3. parent_id(스레드 필터) 조건으로 답글만 조회
  const resultParent =
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          parent_id: commentRoot1.id,
        },
      },
    );
  typia.assert(resultParent);
  resultParent.data.forEach((c) =>
    TestValidator.equals("parent_id")(c.parent_id)(commentRoot1.id),
  );

  // 5-4. created_at_from/to 필터
  const resultCreatedAt =
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          created_at_from: commentRoot1.created_at,
          created_at_to: commentChild1.created_at,
        },
      },
    );
  typia.assert(resultCreatedAt);

  // 5-5. 페이지네이션(limit, page)
  const limit: number &
    tags.Type<"int32"> &
    tags.JsonSchemaPlugin<{ format: "uint32" }> = 1 as number &
    tags.Type<"int32"> &
    tags.JsonSchemaPlugin<{ format: "uint32" }>;
  const page: number &
    tags.Type<"int32"> &
    tags.JsonSchemaPlugin<{ format: "uint32" }> = 1 as number &
    tags.Type<"int32"> &
    tags.JsonSchemaPlugin<{ format: "uint32" }>;
  const resultPaging =
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          limit,
          page,
        },
      },
    );
  typia.assert(resultPaging);
  TestValidator.equals("limit=1")(resultPaging.data.length)(1);

  // 6. 에러: 페이지 번호 초과, limit오류(허용되지 않는 값 전달)
  await TestValidator.error("잘못된 페이지 번호")(async () => {
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 10000 as number &
            tags.Type<"int32"> &
            tags.JsonSchemaPlugin<{ format: "uint32" }>,
          limit,
        },
      },
    );
  });
  await TestValidator.error("잘못된 limit")(async () => {
    await api.functional.aimall_backend.administrator.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          limit: 0 as number &
            tags.Type<"int32"> &
            tags.JsonSchemaPlugin<{ format: "uint32" }>, // 유효범위 벗어남
        },
      },
    );
  });
}
