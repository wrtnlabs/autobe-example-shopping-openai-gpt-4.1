import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 관리자가 커뮤니티 게시글의 첨부 스냅샷을 소유 관계없이 정상 삭제할 수 있음(하드 딜리트)을 검증한다.
 *
 * 관리자 권한의 moderation/컴플라이언스 시나리오로, 임의의 게시글에 첨부된 스냅샷을 postId/snapshotId로 지정해 삭제가
 * 가능하며, 소유 제한 없이 동작해야 한다.
 *
 * 1. 관리자 계정으로 게시글 1개를 생성한다.
 * 2. 해당 게시글에 스냅샷을 최소 1개 생성한다.
 * 3. 생성된 스냅샷을 관리자 권한으로 DELETE API로 삭제한다.
 * 4. 별도의 에러나 소유주 제약 없이 정상 삭제되는지(응답 없음), 관리자의 절대 삭제 권한이 보장되는지 확인한다.
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_test_delete_snapshot_success_administrator(
  connection: api.IConnection,
) {
  // 1. 게시글 생성 (관리자)
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(1),
        is_private: false,
        customer_id: null,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. 해당 게시글에 스냅샷 1개 등록
  const snapshot =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: RandomGenerator.alphaNumeric(32),
          caption: RandomGenerator.paragraph()(1),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. 관리자가 스냅샷을 바로 삭제(postId/snapshotId로 권한 제한 없이 가능해야 한다)
  await api.functional.aimall_backend.administrator.posts.snapshots.erase(
    connection,
    {
      postId: post.id,
      snapshotId: snapshot.id,
    },
  );
}
