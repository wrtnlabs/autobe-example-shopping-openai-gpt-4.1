import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * 커뮤니티 스냅샷(이미지/미디어) 상세 단건 조회(E2E)
 *
 * 관리자 권한으로 특정 스냅샷(snapshotId 기준)의 메타데이터 단건을 정상적으로 조회하는 시나리오입니다.
 *
 * 1. 스냅샷 등록(POST /aimall-backend/administrator/snapshots)을 선행하여 유효한 snapshotId 값을
 *    준비
 * 2. 이후 해당 id로 GET /aimall-backend/administrator/snapshots/{snapshotId}로 상세 정보를 조회
 * 3. 조회된 결과가 생성시 입력/반환정보와 모두 일치하는지 확인 (가능하면, 관리자 접근시 감사로그 등이 생성되는지도 체크할 수 있습니다)
 */
export async function test_api_aimall_backend_administrator_snapshots_test_get_single_snapshot_by_valid_id(
  connection: api.IConnection,
) {
  // 1. 스냅샷을 신규 생성한다 (유효한 snapshotId 확보)
  const snapshotCreate: IAimallBackendSnapshot =
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      {
        body: {
          media_uri: RandomGenerator.alphaNumeric(30),
          caption: RandomGenerator.alphaNumeric(10),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshotCreate);

  // 2. 생성된 snapshotId로 상세 조회
  const snapshotFetched: IAimallBackendSnapshot =
    await api.functional.aimall_backend.administrator.snapshots.at(connection, {
      snapshotId: snapshotCreate.id,
    });
  typia.assert(snapshotFetched);

  // 3. 모든 필드가 생성된 데이터와 일치하는지 확인
  TestValidator.equals("id equals")(snapshotFetched.id)(snapshotCreate.id);
  TestValidator.equals("media_uri equals")(snapshotFetched.media_uri)(
    snapshotCreate.media_uri,
  );
  TestValidator.equals("caption equals")(snapshotFetched.caption)(
    snapshotCreate.caption,
  );
  TestValidator.equals("product_id equals")(snapshotFetched.product_id)(
    snapshotCreate.product_id,
  );
  TestValidator.equals("post_id equals")(snapshotFetched.post_id)(
    snapshotCreate.post_id,
  );
  TestValidator.equals("customer_id equals")(snapshotFetched.customer_id)(
    snapshotCreate.customer_id,
  );
  TestValidator.equals("created_at equals")(snapshotFetched.created_at)(
    snapshotCreate.created_at,
  );

  // (필요시 감사로그 등 별도 체크 가능, 지원 API 없으면 생략)
}
