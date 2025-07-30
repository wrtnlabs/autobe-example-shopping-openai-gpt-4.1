import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 테스트: 관리자로서 댓글에 첨부된 모든 파일(첨부파일) 목록을 성공적으로 조회한다.
 *
 * 비즈니스 시나리오:
 *
 * 1. 고객으로 댓글을 생성한다.
 * 2. 해당 댓글에 2개의 첨부파일을 업로드한다(고객의 첨부 업로드 엔드포인트 사용).
 * 3. 관리자로서 제공된 댓글 ID로 첨부파일 목록을 조회한다.
 * 4. 리스트에 방금 등록한 첨부파일 2개와 모든 메타데이터(id, comment_id, file_uri, file_type, file_size,
 *    created_at)가 포함되어 있는지 검증한다.
 * 5. 응답에 오직 대상 comment_id에 속한 첨부파일만 포함되어 있는지 확인한다.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_index_test_retrieve_attachments_for_comment_as_administrator_with_valid_id(
  connection: api.IConnection,
) {
  // 1. 고객으로 댓글 작성
  const commentInput: IAimallBackendComment.ICreate = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: commentInput,
    },
  );
  typia.assert(comment);

  // 2. 댓글에 2개의 첨부파일 업로드
  const attachmentInputs: IAimallBackendAttachment.ICreate[] = [
    {
      comment_id: comment.id,
      file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.png`,
      file_type: "image/png",
      file_size: 51234,
    },
    {
      comment_id: comment.id,
      file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
      file_type: "application/pdf",
      file_size: 34010,
    },
  ];
  const attachments: IAimallBackendAttachment[] = [];
  for (const input of attachmentInputs) {
    const attachment =
      await api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: input,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }

  // 3. 관리자로 댓글의 첨부파일 목록 조회
  const attachmentsList =
    await api.functional.aimall_backend.administrator.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(attachmentsList);

  // 4. 응답에 등록한 두 첨부파일만 있고, 모든 필드가 정확히 매칭되는지 확인
  const returned = attachmentsList.data.filter(
    (a) => a.comment_id === comment.id,
  );
  TestValidator.equals("첨부파일 개수")(returned.length)(attachments.length);
  for (const a of attachments) {
    const found = returned.find((r) => r.id === a.id);
    TestValidator.predicate(`첨부파일 ${a.id} 조회됨`)(!!found);
    if (found) {
      TestValidator.equals("comment_id")(found.comment_id)(comment.id);
      TestValidator.equals("file_uri")(found.file_uri)(a.file_uri);
      TestValidator.equals("file_type")(found.file_type)(a.file_type);
      TestValidator.equals("file_size")(found.file_size)(a.file_size);
      TestValidator.equals("created_at")(found.created_at)(a.created_at);
    }
  }
}
