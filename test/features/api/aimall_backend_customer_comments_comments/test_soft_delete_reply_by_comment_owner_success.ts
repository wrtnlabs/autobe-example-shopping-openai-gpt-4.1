import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * 댓글 작성자가 직접 단 대댓글(자식 댓글)에 대해 소프트 삭제(논리적 삭제)를 수행하는 정상 사례를 검증합니다.
 *
 * 커뮤니티 내 댓글 - 대댓글 구조에서 댓글의 소유자(고객)가 본인이 작성한 자식 댓글(대댓글)에 대해 소프트 삭제를 진행하는 시나리오를
 * 테스트합니다. 삭제 처리된 댓글은 deleted_at 필드가 세팅되어 시스템/감사용으로만 저장되며, 서비스에서 일반적으로 노출되지
 * 않습니다. 본 테스트는 parent(부모) 댓글과 child(자식) 댓글을 생성 후, child 댓글에 대한 삭제 API 호출 및 반환값
 * 검증을 수행합니다.
 *
 * 절차:
 *
 * 1. (가정) Test용 post_id 임의 생성
 * 2. Parent(부모) 댓글 생성 (post_id로 연결)
 * 3. Child(자식, 대댓글) 생성 (parent의 id 기준, 동일 고객)
 * 4. Child 댓글 삭제 API 호출 (soft delete)
 * 5. 반환 void(실제 empty)임을 검증
 * 6. Deleted_at 등 필드는 별도 조회 API 부재로 추가 검증 불가(보완 API 추가시 확장 가능)
 */
export async function test_api_aimall_backend_customer_comments_comments_test_soft_delete_reply_by_comment_owner_success(
  connection: api.IConnection,
) {
  // 1. (가정) 임의의 post_id 생성 (실제 글 UUID)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2. parent(부모) 댓글 생성
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: postId,
        body: "parent 댓글(루트) - soft delete test",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 3. child(자식 대댓글) 생성
  const childComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          post_id: postId,
          parent_id: parentComment.id,
          body: "child 댓글(대댓글) - 삭제 대상",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(childComment);

  // 4. child(자식 댓글)에 대해 DELETE (soft delete)
  const output =
    await api.functional.aimall_backend.customer.comments.comments.erase(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: childComment.id,
      },
    );
  TestValidator.equals("void 반환")(output)(undefined);

  // 5. (참고) deleted_at 등 감사 필드 직접 조회는 별도 comments/{id} API 등 부재시 생략
}
