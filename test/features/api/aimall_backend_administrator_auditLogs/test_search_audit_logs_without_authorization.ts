import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAuditLog";
import type { IPageIAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 비인가 사용자의 감사 로그 조회 시도 거부 검증
 *
 * 이 테스트는 관리자가 아닌(즉, 인증 토큰이 없는) 사용자가 감사 로그(PATCH
 * /aimall-backend/administrator/auditLogs)를 조회하려고 할 때, 시스템이 적절하게 권한 거부(401/403
 * 등)를 반환하고, 어떠한 감사 로그 데이터도 노출하지 않는지 확인합니다.
 *
 * [테스트 시나리오]
 *
 * 1. 관리자 권한이나 인증 없이 connection 객체를 그대로 사용하여 감사 로그 조회 API를 호출합니다.
 * 2. 반드시 401/403 권한 오류가 발생해야 하며, 데이터가 반환되면 테스트는 실패입니다.
 * 3. 만약 예외가 발생하지 않고 데이터가 반환된다면 이는 심각한 보안 결함으로 간주합니다.
 */
export async function test_api_aimall_backend_administrator_auditLogs_test_search_audit_logs_without_authorization(
  connection: api.IConnection,
) {
  // 1. 인증(관리자 토큰 등) 없는 connection으로 감사 로그 검색 시도
  await TestValidator.error(
    "비인가 사용자의 감사 로그 열람은 반드시 거부되어야 한다",
  )(async () => {
    await api.functional.aimall_backend.administrator.auditLogs.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  });
}
