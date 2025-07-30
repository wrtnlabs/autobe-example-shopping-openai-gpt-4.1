import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IPageIAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * 채널별 섹션 목록 수신 E2E 테스트
 *
 * 지정한 채널에 여러 섹션을 등록 후, 리스트 API로 모든 레코드가 올바르게 반환되는지 검증한다.
 *
 * 1. 신규 채널 생성
 * 2. N개의 section을 연달아 등록
 * 3. 섹션 목록 API (GET /aimall-backend/administrator/channels/{channelId}/sections)
 *    호출
 * 4. 생성한 섹션 수 일치 및 각 레코드 속성/채널 연결성 정확성 검증
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_list_sections_for_channel_returns_all_sections(
  connection: api.IConnection,
) {
  // 1. 신규 채널 생성
  const channelInput: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 2. 여러 section 등록
  const sectionInputs: IAimallBackendSection.ICreate[] = ArrayUtil.repeat(3)(
    (idx) => ({
      channel_id: channel.id,
      code: RandomGenerator.alphaNumeric(6),
      name: RandomGenerator.name(),
      display_order: idx + 1,
      enabled: idx % 2 === 0, // 홀수번째는 활성, 짝수는 비활성
    }),
  );
  const createdSections: IAimallBackendSection[] = [];
  for (const input of sectionInputs) {
    const section =
      await api.functional.aimall_backend.administrator.channels.sections.create(
        connection,
        { channelId: channel.id, body: input },
      );
    typia.assert(section);
    createdSections.push(section);
  }

  // 3. 섹션 리스트 API 호출
  const pageResult =
    await api.functional.aimall_backend.administrator.channels.sections.index(
      connection,
      { channelId: channel.id },
    );
  typia.assert(pageResult);

  // 4. 전체 생성 섹션의 개수, 속성, 상위 채널 ID 일치 검증
  TestValidator.equals("section count")(pageResult.data.length)(
    createdSections.length,
  );

  for (const created of createdSections) {
    const found = pageResult.data.find((section) => section.id === created.id);
    TestValidator.predicate("section exists")(!!found);
    if (found) {
      TestValidator.equals("channel_id")(found.channel_id)(channel.id);
      TestValidator.equals("code")(found.code)(created.code);
      TestValidator.equals("name")(found.name)(created.name);
      TestValidator.equals("display_order")(found.display_order)(
        created.display_order,
      );
      TestValidator.equals("enabled")(found.enabled)(created.enabled);
    }
  }
}
