import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISeller } from "@ORGANIZATION/PROJECT-api/lib/structures/ISeller";

export async function test_api_sellers_putById(connection: api.IConnection) {
  const output: ISeller = await api.functional.sellers.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<ISeller.IUpdate>(),
  });
  typia.assert(output);
}
