import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 테스트: 댓글 소유 고객이 첨부파일을 성공적으로 업로드하고 연결할 수 있는지 검증
 *
 * 이 테스트는 다음 시나리오를 검증합니다:
 *
 * 1. 고객이 새로운 게시글을 작성한다.
 * 2. 동일 고객이 해당 게시글에 댓글을 작성한다.
 * 3. 댓글에 이미지 첨부파일을 업로드한다.
 * 4. 생성된 첨부파일 레코드가 올바르게 댓글에 연결되고, 주요 메타데이터가 모두 저장되어 있는지 검증한다.
 *
 * ※ 인증/회원가입 관련 endpoint는 본 SDK 내에 없으므로 '고객 세션'은 connection 파라미터로 가정합니다. ※ 첨부파일
 * 조회(상세/목록) endpoint 미제공으로 반환 레코드 기반으로만 검증합니다.
 *
 * 단계별 절차:
 *
 * 1. 게시글 생성 (고객 권한)
 * 2. 게시글에 댓글 작성 (고객 권한)
 * 3. 댓글에 이미지 파일 첨부
 * 4. 첨부파일과 댓글 간 linkage, 파일 메타데이터(유형/크기/파일경로) 검증
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_create_attachment_comment_as_owner_success(
  connection: api.IConnection,
) {
  // 1. 게시글 생성 (고객)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. 댓글 작성
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(1),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. 댓글에 이미지 첨부 파일 생성(업로드)
  const fileUri = `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const fileType = "image/jpeg";
  const fileSize = Math.max(
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<5242880>
    >(),
    1024,
  ); // 1KB~5MB

  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: fileUri,
          file_type: fileType,
          file_size: fileSize,
          post_id: null,
          review_id: null,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. 첨부파일 - 댓글 간 연결, 파일 메타데이터 검증
  TestValidator.equals("첨부파일 댓글 연결됨")(attachment.comment_id)(
    comment.id,
  );
  TestValidator.equals("파일 유형 일치")(attachment.file_type)(fileType);
  TestValidator.equals("파일 크기 일치")(attachment.file_size)(fileSize);
  TestValidator.predicate("파일 URI 형식 확인")(
    attachment.file_uri.startsWith("s3://"),
  );
}
