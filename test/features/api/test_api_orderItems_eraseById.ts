import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderItem";

export async function test_api_orderItems_eraseById(
  connection: api.IConnection,
) {
  const output: IOrderItem = await api.functional.orderItems.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
