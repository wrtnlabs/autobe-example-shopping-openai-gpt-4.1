import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IExchange";

export async function test_api_exchanges_putById(connection: api.IConnection) {
  const output: IExchange = await api.functional.exchanges.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IExchange.IUpdate>(),
  });
  typia.assert(output);
}
