import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IExchange";

export async function test_api_exchanges_getById(connection: api.IConnection) {
  const output: IExchange = await api.functional.exchanges.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
