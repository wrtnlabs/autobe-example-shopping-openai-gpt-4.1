import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 판매자 커뮤니티 게시글에 미디어(스냅샷) 첨부 생성 E2E 테스트
 *
 * - 게시글(post) 생성 → 게시글에 스냅샷(media) 첨부(정상/오류) 시나리오 전체 검증
 * - Media_uri, caption 값 일치 및 post_id 연결 일관성 체크
 * - 인증(로그인/회원가입) API가 별도로 제공되지 않은 환경에서 실행
 *
 * [테스트 절차]
 *
 * 1. 판매자 게시글(post) 생성 (사전 의존성)
 * 2. 정상 - postId, media_uri, caption 포함 스냅샷 등록 및 응답 데이터 일치 검증
 * 3. 오류 - 미존재 postId에 첨부 시도 → 실패
 * 4. (TypeScript 타입 위반으로 인해 media_uri 누락 테스트는 실제론 스킵)
 */
export async function test_api_aimall_backend_seller_posts_snapshots_test_create_snapshot_for_post_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 판매자 게시글(post) 생성
  const postInput = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. 정상 - 스냅샷(media_uri, postId 필수, caption 옵션) 등록 및 검증
  const mediaUri = `https://static.aimall.com/${RandomGenerator.alphaNumeric(10)}.jpg`;
  const caption = RandomGenerator.paragraph()();
  const snapshotInput = {
    post_id: post.id,
    media_uri: mediaUri,
    caption,
  } satisfies IAimallBackendSnapshot.ICreate;
  const snapshot =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("post_id 일치")(snapshot.post_id)(post.id);
  TestValidator.equals("media_uri 일치")(snapshot.media_uri)(mediaUri);
  TestValidator.equals("caption 일치")(snapshot.caption)(caption);

  // 3. 오류 - 미존재 postId로 시도 → 실패 검증
  await TestValidator.error("존재하지 않는 postId 실패")(() =>
    api.functional.aimall_backend.seller.posts.snapshots.create(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: snapshotInput,
    }),
  );

  // 4. (타입 미충족 케이스는 TypeScript가 컴파일 자체를 막아 실행 불가하므로 skip)
}
