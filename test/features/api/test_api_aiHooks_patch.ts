import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageAiHook } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAiHook";
import { IAiHook } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiHook";

export async function test_api_aiHooks_patch(connection: api.IConnection) {
  const output: IPageAiHook = await api.functional.aiHooks.patch(connection, {
    body: typia.random<IAiHook.IRequest>(),
  });
  typia.assert(output);
}
