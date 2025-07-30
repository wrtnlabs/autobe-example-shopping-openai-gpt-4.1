import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * 유효한 정보로 새로운 AIMall 관리자(Administrator) 계정의 생성 동작 E2E 검증.
 *
 * - 슈퍼 어드민/권한 관리자 등 적격 계정에서, 필수 입력(permission_id, email, name, status)만을 사용해 새로운
 *   관리자 계정을 등록한다.
 * - 반환된 리소스에서 모든 DTO 필드가 존재하고, 입력 정보와 일치하는지 및 각 필드의 형식을 검증한다.
 * - 인증/인가가 없는 connection(Authorization 미포함)으로 호출하면 실패하는지 점검한다.
 * - 감사 로그(Audit trail) 등록 여부도 확인하지만, 관련 API가 제공되지 않을 경우 스킵한다.
 *
 * [테스트 순서와 검증 포인트]
 *
 * 1. 관리자 계정 생성용 입력 데이터(권한 PK, 이메일, 이름, 상태) 준비
 * 2. API를 호출하여 신규 관리자 계정 생성
 * 3. 응답으로 받은 관리자 리소스의 각 필드 존재 및 값 일치 여부 확인
 * 4. Id/created_at/updated_at 등의 포맷과 데이터 유효성 검사
 * 5. 인증 토큰 없는 connection(Authorization 헤더 제거)로 생성 시 실패(예외 발생) 검증
 * 6. (선택) 감사 로그 등록 여부 확인 - 별도 엔드포인트가 있을 때만 추가
 */
export async function test_api_aimall_backend_administrator_administrators_create(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성용 입력 데이터 준비 (permission_id, email, name, status)
  const input: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    status: "active",
  };

  // 2. API를 이용해 관리자 계정 생성
  const administrator: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: input },
    );
  typia.assert(administrator);

  // 3. 응답 필드 값 일치, 필수 값/포맷 검증
  TestValidator.equals("permission_id matches")(administrator.permission_id)(
    input.permission_id,
  );
  TestValidator.equals("email matches")(administrator.email)(input.email);
  TestValidator.equals("display name matches")(administrator.name)(input.name);
  TestValidator.equals("status matches")(administrator.status)(input.status);
  TestValidator.predicate("id must be valid uuid")(administrator.id.length > 0);
  TestValidator.predicate("created_at date-time exists")(
    typeof administrator.created_at === "string" &&
      administrator.created_at.length > 0,
  );
  TestValidator.predicate("updated_at date-time exists")(
    typeof administrator.updated_at === "string" &&
      administrator.updated_at.length > 0,
  );

  // 4. 인증/인가 없는 connection으로 생성 시도를 하면 실패해야 함
  const connWithoutAuth = {
    ...connection,
    headers: Object.fromEntries(
      Object.entries(connection.headers ?? {}).filter(
        ([k]) => k.toLowerCase() !== "authorization",
      ),
    ),
  };
  await TestValidator.error("unauthenticated fails")(async () => {
    await api.functional.aimall_backend.administrator.administrators.create(
      connWithoutAuth,
      { body: input },
    );
  });
  // 5. 감사 로그(감사 trail)는 별도 API가 없으므로 생략
}
