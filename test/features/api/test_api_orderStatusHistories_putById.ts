import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderStatusHistory";

export async function test_api_orderStatusHistories_putById(
  connection: api.IConnection,
) {
  const output: IOrderStatusHistory =
    await api.functional.orderStatusHistories.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IOrderStatusHistory.IUpdate>(),
    });
  typia.assert(output);
}
