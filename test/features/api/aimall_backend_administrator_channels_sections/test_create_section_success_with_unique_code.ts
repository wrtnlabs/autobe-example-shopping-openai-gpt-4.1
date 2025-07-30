import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * 검증: 관리자가 기존 채널 아래에 새로운 섹션을 성공적으로 생성할 수 있어야 합니다.
 *
 * 1. 테스트용 채널을 신규로 생성(채널 코드는 랜덤하고, 표시 이름도 랜덤 지정)
 * 2. 그 채널의 id로, 고유한 code와 valid한 display name 을 가진 section 생성 요청
 * 3. Section 생성 API의 응답값이 요청에 사용된 값과 일치하는지 확인
 * 4. Parent channel id가 올바르게 셋팅됐는지 같이 확인
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_create_section_success_with_unique_code(
  connection: api.IConnection,
) {
  // 1. 채널 우선 생성
  const channelInput: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: `테스트채널-${RandomGenerator.alphaNumeric(5)}`,
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: channelInput,
      },
    );
  typia.assert(channel);

  // 2. 해당 채널 id로 고유 code/valid name 섹션 생성 요청
  const sectionInput: IAimallBackendSection.ICreate = {
    channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: `테스트섹션-${RandomGenerator.alphaNumeric(5)}`,
    display_order: typia.random<number & tags.Type<"int32">>(),
    enabled: true,
  };
  const section =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);
  // 3. 응답값 검증
  TestValidator.equals("섹션 코드 일치")(section.code)(sectionInput.code);
  TestValidator.equals("섹션 이름 일치")(section.name)(sectionInput.name);
  TestValidator.equals("display_order 일치")(section.display_order)(
    sectionInput.display_order,
  );
  TestValidator.equals("enabled 일치")(section.enabled)(sectionInput.enabled);
  // 4. 채널 id 정상 할당 확인
  TestValidator.equals("parent channel id 일치")(section.channel_id)(
    channel.id,
  );
}
