import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrder";

export async function test_api_orders_post(connection: api.IConnection) {
  const output: IOrder = await api.functional.orders.post(connection, {
    body: typia.random<IOrder.ICreate>(),
  });
  typia.assert(output);
}
