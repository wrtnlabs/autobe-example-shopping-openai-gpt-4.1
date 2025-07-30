import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAuditLog";

/**
 * 감사 로그 조회 요청 시 존재하지 않는 auditLogId를 사용하면 오류가 반환되는지 검증합니다.
 *
 * 이 테스트는 AuditLog의 GET 단일조회에서 실제 DB에 존재하지 않는 UUID로 조회할 때, 시스템이 명확하게 에러 응답을
 * 제공하는지 확인합니다. 잘못된 식별자를 통한 정보 노출/무단 응답을 방지하고, 감사 로그 접근 보안성을 직접 검증하는 사례입니다.
 *
 * 1. 무작위로 유효한 UUID를 생성 (테스트 환경 상 실제 DB에 존재할 수 없음에 주의)
 * 2. 해당 auditLogId로 auditLogs.at API를 호출
 * 3. 정상 응답(IAimallBackendAuditLog)이 반환되면 테스트는 실패로 간주
 * 4. 오류가 발생해야 테스트가 성공함 (TestValidator.error로 감싼다)
 */
export async function test_api_aimall_backend_administrator_auditLogs_at_test_retrieve_audit_log_with_nonexistent_id_returns_error(
  connection: api.IConnection,
) {
  // 1. 존재하지 않을 무작위 UUID 생성
  const nonExistentAuditLogId = typia.random<string & tags.Format<"uuid">>();

  // 2~4. 해당 ID로 API 호출 시 오류 반환되어야 함 (정상 데이터 수신 시 실패)
  await TestValidator.error("존재하지 않는 감사 로그 ID로 조회 시 오류 발생")(
    async () => {
      await api.functional.aimall_backend.administrator.auditLogs.at(
        connection,
        {
          auditLogId: nonExistentAuditLogId,
        },
      );
    },
  );
}
