import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * 기존 백엔드 설정(configuration)의 완전한 영구 삭제를 검증합니다.
 *
 * 이 테스트는 실제로 삭제된 설정이 시스템에서 되돌릴 수 없다는 것을 확인합니다. 주요 시나리오는 다음과 같습니다.
 *
 * 1. 새로운 백엔드 설정을 등록합니다(적절한 key, value, 기타 필드 랜덤생성).
 * 2. 생성된 설정의 id (configurationId)로 삭제 API를 호출합니다.
 * 3. 삭제가 정상적으로 처리되어 API가 content를 반환하지 않음(=void, 204 No Content 등)을 검증합니다.
 *
 * (참고: 명시적 단일 조회(READ) API가 제공되지 않아 삭제 이후 개체의 부재를 호출로 검증할 수는 없습니다.)
 */
export async function test_api_aimall_backend_administrator_configurations_test_delete_existing_configuration_success(
  connection: api.IConnection,
) {
  // 1. 새로운 설정 등록 (테스트용)
  const createBody = {
    key: `test_config_key_${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph()(),
  } satisfies IAimallBackendConfiguration.ICreate;

  const configuration =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      { body: createBody },
    );
  typia.assert(configuration);

  // 2. 생성된 ID로 삭제 요청
  const result =
    await api.functional.aimall_backend.administrator.configurations.erase(
      connection,
      { configurationId: configuration.id },
    );

  // 3. 반환값이 void(undefined)임을 확인
  TestValidator.equals("erase should return void")(result)(undefined);
}
