import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAiHook } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiHook";

export async function test_api_aiHooks_post(connection: api.IConnection) {
  const output: IAiHook = await api.functional.aiHooks.post(connection, {
    body: typia.random<IAiHook.ICreate>(),
  });
  typia.assert(output);
}
