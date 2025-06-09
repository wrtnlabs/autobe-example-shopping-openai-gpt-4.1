import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAiHook } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiHook";

export async function test_api_aiHooks_putById(connection: api.IConnection) {
  const output: IAiHook = await api.functional.aiHooks.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IAiHook.IUpdate>(),
  });
  typia.assert(output);
}
