import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOrder";
import { IOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrder";

export async function test_api_orders_patch(connection: api.IConnection) {
  const output: IPageIOrder = await api.functional.orders.patch(connection, {
    body: typia.random<IOrder.IRequest>(),
  });
  typia.assert(output);
}
