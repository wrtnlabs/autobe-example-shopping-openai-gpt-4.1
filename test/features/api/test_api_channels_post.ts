import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IChannel";

export async function test_api_channels_post(connection: api.IConnection) {
  const output: IChannel = await api.functional.channels.post(connection, {
    body: typia.random<IChannel.ICreate>(),
  });
  typia.assert(output);
}
