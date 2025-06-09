import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOrderItem";
import { IOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderItem";

export async function test_api_orderItems_patch(connection: api.IConnection) {
  const output: IPageIOrderItem = await api.functional.orderItems.patch(
    connection,
    {
      body: typia.random<IOrderItem.IRequest>(),
    },
  );
  typia.assert(output);
}
