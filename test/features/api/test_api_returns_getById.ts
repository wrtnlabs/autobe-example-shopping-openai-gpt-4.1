import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IReturn";

export async function test_api_returns_getById(connection: api.IConnection) {
  const output: IReturn = await api.functional.returns.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
