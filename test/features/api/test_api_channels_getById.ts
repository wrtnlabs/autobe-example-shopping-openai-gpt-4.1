import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IChannel";

export async function test_api_channels_getById(connection: api.IConnection) {
  const output: IChannel = await api.functional.channels.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
