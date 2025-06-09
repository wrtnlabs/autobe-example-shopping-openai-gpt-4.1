import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IExchange";

export async function test_api_exchanges_post(connection: api.IConnection) {
  const output: IExchange = await api.functional.exchanges.post(connection, {
    body: typia.random<IExchange.ICreate>(),
  });
  typia.assert(output);
}
