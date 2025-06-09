import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrder";

export async function test_api_orders_putById(connection: api.IConnection) {
  const output: IOrder = await api.functional.orders.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IOrder.IUpdate>(),
  });
  typia.assert(output);
}
