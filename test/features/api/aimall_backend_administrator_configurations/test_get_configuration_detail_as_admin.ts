import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * 관리자 권한으로 특정 설정(configuration) 엔티티 상세 조회를 검증합니다.
 *
 * 1. 임의의 설정 레코드를 먼저 생성합니다 (POST /aimall-backend/administrator/configurations)
 * 2. 생성한 설정의 id를 사용해, 해당 설정 엔티티의 상세 정보를 조회합니다 (GET
 *    /aimall-backend/administrator/configurations/{configurationId})
 * 3. Key, value, channel_id, section_id, description 및 생성/수정 시각, id 등의 주요 필드가
 *    정상적으로 출력되는지 검증합니다.
 * 4. 생성시 입력값과 상세 조회 응답값이 완전히 일치하는지 비교하여 무결성을 확인합니다.
 *
 * 이 테스트는 관리자 API 접근 권한과 엔티티 무결성(정확한 저장 및 조회)을 동시에 검증하는 시나리오입니다.
 */
export async function test_api_aimall_backend_administrator_configurations_test_get_configuration_detail_as_admin(
  connection: api.IConnection,
) {
  // 1. 임의의 설정 레코드 생성
  const configInput: IAimallBackendConfiguration.ICreate = {
    key: `test_key_${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.alphaNumeric(16),
    channel_id: null, // 글로벌 config (채널 미지정)
    section_id: null,
    description: "API E2E 테스트용 설정 엔트리",
  };
  const created: IAimallBackendConfiguration =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      { body: configInput },
    );
  typia.assert(created);

  // 2. 생성한 설정 ID로 상세 데이터 조회
  const detail: IAimallBackendConfiguration =
    await api.functional.aimall_backend.administrator.configurations.at(
      connection,
      { configurationId: created.id },
    );
  typia.assert(detail);

  // 3. 상세 조회 응답의 모든 주요 필드 검사
  TestValidator.equals("key 일치")(detail.key)(configInput.key);
  TestValidator.equals("value 일치")(detail.value)(configInput.value);
  TestValidator.equals("channel_id 일치")(detail.channel_id)(
    configInput.channel_id,
  );
  TestValidator.equals("section_id 일치")(detail.section_id)(
    configInput.section_id,
  );
  TestValidator.equals("description 일치")(detail.description)(
    configInput.description,
  );
  TestValidator.predicate("id는 string uuid 형식")(
    typeof detail.id === "string" && detail.id.length > 10,
  );
  TestValidator.predicate("created_at이 ISO8601 포맷")(
    typeof detail.created_at === "string" && detail.created_at.includes("T"),
  );
  TestValidator.predicate("updated_at이 ISO8601 포맷")(
    typeof detail.updated_at === "string" && detail.updated_at.includes("T"),
  );

  // 4. id 일치 최종 확인(무결성)
  TestValidator.equals("조회된 ID가 생성 ID와 동일")(detail.id)(created.id);
}
