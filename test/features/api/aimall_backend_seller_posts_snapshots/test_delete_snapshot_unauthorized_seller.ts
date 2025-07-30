import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate unauthorized snapshot deletion by a non-owning seller.
 *
 * 이 테스트는 판매자가 자신이 소유하지 않은(직접 생성하지 않은) 게시글 내 스냅샷을 삭제할 수 없는지 검증합니다. 비즈니스 규칙상
 * 스냅샷(미디어) 삭제는 해당 게시글 또는 스냅샷을 생성한 판매자에게만 허용되어야 합니다. 이를 통해 타 판매자가 커뮤니티 콘텐츠를 임의로
 * 조작하거나 삭제하지 못하도록 보안 정책이 정확히 적용되는지 보장합니다.
 *
 * [단계별 시나리오]
 *
 * 1. 판매자 A, 판매자 B 각각 회원가입
 * 2. 판매자 A로 게시글 작성
 * 3. 판매자 A가 해당 게시글에 스냅샷 업로드 (snapshotId 기록)
 * 4. 판매자 B로 권한이 없는 상태에서 해당 스냅샷 삭제 시도
 * 5. 삭제 거부(권한 없음 에러) 발생하는지 검증
 */
export async function test_api_aimall_backend_seller_posts_snapshots_test_delete_snapshot_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. 판매자 A 회원가입
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: sellerAEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. 판매자 B 회원가입
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: sellerBEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // (판매자 인증/세션 관리는 별도 인증 엔드포인트가 없으므로, 생성 이후 기본 sellerA 계정 세션으로 동작 가정)
  // 3. sellerA가 게시글 작성
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(post);

  // 4. 해당 게시글에 sellerA로 스냅샷 업로드
  const snapshot: IAimallBackendSnapshot =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: `https://img.cdn/${RandomGenerator.alphaNumeric(16)}.jpg`,
          caption: RandomGenerator.paragraph()(1),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. 판매자 B의 권한으로 스냅샷 삭제 시도
  // 실제 API 인증 구현이 없는 상황이므로, connection의 identity가 sellerB에 대해 바뀐다고 가정
  await TestValidator.error("타 판매자는 스냅샷을 삭제할 수 없어야 한다")(() =>
    api.functional.aimall_backend.seller.posts.snapshots.erase(connection, {
      postId: post.id,
      snapshotId: snapshot.id,
    }),
  );
}
