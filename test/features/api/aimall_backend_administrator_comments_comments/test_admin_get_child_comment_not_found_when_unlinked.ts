import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * 관리자 권한으로 parent-child 댓글 계층 위반 조회 시 NOT FOUND 에러 검증
 *
 * 관리자(Administrator)가 부모 댓글(commentId) 아래의 자식 댓글(childCommentId)을 조회하려 하지만, 실제
 * 해당 childCommentId가 주어진 commentId의 직접적인 자식이 아닌 경우(즉, 부모-자식 링크가 없음) 적절한 에러가
 * 반환되는지 검증한다.
 *
 * 이 테스트는 실수 혹은 악의적 접근으로 잘못된 부모-자식 계층에서 댓글 조회가 시도될 때, API가 스레드 무결성(트리 구조의 정확한 계층
 * 검증)을 보장하는지 확인한다.
 *
 * 1. 독립적인 댓글 A와 B 생성 (각각 parent가 없음)
 * 2. 댓글 A에 대한 reply(자식 댓글 C) 생성 (parent가 A인 C)
 * 3. (잘못된 계층) 부모: B, 자식: C 로 조합하여 관리자 reply 상세조회 API 요청
 *
 * - 이때 C의 parent_id는 A임에도 불구하고, B 아래에 있는 자식처럼 조회를 시도
 *
 * 4. API가 NOT FOUND (or 불일치) 에러를 반환하는지 확인
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_get_child_comment_not_found_when_unlinked(
  connection: api.IConnection,
) {
  // 1. 독립적인 댓글 A, B 생성
  const commentA = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: "Parent comment A",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(commentA);

  const commentB = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: "Parent comment B",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(commentB);

  // 2. 댓글 A에 대한 reply C 생성
  const commentC =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: commentA.id,
        body: {
          body: "Child comment C (reply to A)",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(commentC);

  // 3. 관리자 자격으로, 부모: B, 자식: C 조합으로 상세조회 시도 (실제 C는 A의 자식)
  await TestValidator.error("자식 C가 부모 B에 연결되지 않음 - NOT FOUND 반환")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.comments.at(
        connection,
        {
          commentId: commentB.id,
          childCommentId: commentC.id,
        },
      );
    },
  );
}
