import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * 검증: 고객(작성자)이 자신의 댓글을 소프트 삭제(논리 삭제)할 수 있음
 *
 * 비즈니스 맥락:
 *
 * - 댓글 소유자(고객)가 로그인 상태에서 댓글을 작성하고, 자신이 쓴 댓글을 소프트 삭제(erase) 처리할 수 있어야 한다.
 * - 소프트 삭제란 DB에서 완전히 제거되는 것이 아니라 deleted_at 필드가 세팅되는 논리 삭제를 뜻한다.
 * - 삭제 후에는 일반 댓글 리스트에서 보이지 않아야 하지만, 감사 및 규정준수 목적을 위해 데이터는 유지되어야 한다.
 *
 * 테스트 절차:
 *
 * 1. 댓글 생성 (고객 인증 상태에서 comments.create)
 * 2. 생성한 댓글 소프트 삭제 (comments.erase)
 * 3. 댓글 fetch (별도 단건 조회 API가 없어 스킵/주의)
 * 4. Deleted_at 필드가 세팅되었는지 확인 (단건 조회 API 없으므로 불가, 주석 처리)
 * 5. 리스트에서 안 보이는지 확인 (리스트 API 없으므로 불가, 주석 처리)
 * 6. (비즈니스 확인) 댓글 데이터는 물리적으로 삭제되지 않고, DB엔 잔존해야 함
 *
 * ※ 단건 단일 댓글 조회(get by id) 또는 리스트 API가 없으므로, 생성된 댓글의 deleted_at 값을 실질적으로 확인할 수
 * 없음. 실제 감사/DB 레벨 E2E에선 추가 API나 DB 직렬 접근이 필요하나, 본 테스트에서는 지원 범위 내 작업만 수행.
 */
export async function test_api_aimall_backend_customer_comments_test_soft_delete_comment_by_author(
  connection: api.IConnection,
) {
  // 1. 댓글 생성 (고객 인증 상태)
  const input: IAimallBackendComment.ICreate = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: input,
    },
  );
  typia.assert(comment);

  // 2. 생성된 댓글 소프트 삭제
  await api.functional.aimall_backend.customer.comments.erase(connection, {
    commentId: comment.id,
  });

  // 3. 단건 댓글 fetch - 제공된 API에서는 불가 (별도 단건조회 API 미제공)
  // 4. deleted_at 세팅 확인 - API로 불가
  // 5. 리스트 미노출 확인 - API로 불가

  // API 한계상, 데이터 DB 잔존 및 deleted_at 필드 세팅 검증은 불가
  // -> 지원 범위 내에서만 테스트 구현
}
