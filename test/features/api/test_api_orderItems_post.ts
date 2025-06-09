import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderItem";

export async function test_api_orderItems_post(connection: api.IConnection) {
  const output: IOrderItem = await api.functional.orderItems.post(connection, {
    body: typia.random<IOrderItem.ICreate>(),
  });
  typia.assert(output);
}
