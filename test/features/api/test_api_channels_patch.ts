import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChannel";
import { IChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IChannel";

export async function test_api_channels_patch(connection: api.IConnection) {
  const output: IPageIChannel = await api.functional.channels.patch(
    connection,
    {
      body: typia.random<IChannel.IRequest>(),
    },
  );
  typia.assert(output);
}
