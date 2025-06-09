import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrder";

export async function test_api_orders_eraseById(connection: api.IConnection) {
  const output: IOrder = await api.functional.orders.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
