import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * 존재하지 않는 configurationId에 대한 상세 조회 시 404 오류 및 데이터 유출 없는지 검증
 *
 * 이 테스트는 관리자가 /aimall-backend/administrator/configurations/{configurationId}
 * 엔드포인트로 존재하지 않는(이미 삭제되었거나, 애초에 생성된 적 없는) valid UUID 값을 지정하여 상세 조회를 시도할 경우,
 * 시스템이 404 Not Found 오류와 함께 명확한 에러 메시지로만 응답하고 어떠한 데이터 유출(예: 내부 객체 상세 등)도 발생하지
 * 않는지 보장하는 목적이다.
 *
 * 비즈니스 컨텍스트:
 *
 * - 관리자 인터페이스에서 잘못된/삭제된 configurationId로 접근 시 서버가 적절히 방어적으로 동작해야 한다.
 * - 민감 정보나 내부 데이터 구조가 노출되어선 안 된다.
 *
 * 테스트 절차:
 *
 * 1. 존재하지 않는(무작위) UUID를 configurationId로 준비한다.
 * 2. 해당 ID로 GET 요청을 보낸다.
 * 3. 404 Not Found 에러 및 예외가 throw되는지 검증한다.
 * 4. 에러 발생 시 데이터 구조나 내부정보 노출 없이, 메시지 정도만 반환되는지만 확인한다.
 */
export async function test_api_aimall_backend_administrator_configurations_test_get_configuration_detail_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 무작위 configurationId 생성
  const configurationId: string = typia.random<string & tags.Format<"uuid">>();

  // 2~4. 해당 ID로 GET 요청 → 404 에러 발생 및 데이터 유출 없음 검증
  await TestValidator.error(
    "존재하지 않는 configurationId는 404를 리턴해야 함",
  )(async () => {
    await api.functional.aimall_backend.administrator.configurations.at(
      connection,
      {
        configurationId,
      },
    );
  });
}
