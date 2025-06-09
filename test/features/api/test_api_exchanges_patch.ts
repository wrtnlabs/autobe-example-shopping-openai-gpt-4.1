import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIExchange";
import { IExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IExchange";

export async function test_api_exchanges_patch(connection: api.IConnection) {
  const output: IPageIExchange = await api.functional.exchanges.patch(
    connection,
    {
      body: typia.random<IExchange.IRequest>(),
    },
  );
  typia.assert(output);
}
