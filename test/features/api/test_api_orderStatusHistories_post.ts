import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderStatusHistory";

export async function test_api_orderStatusHistories_post(
  connection: api.IConnection,
) {
  const output: IOrderStatusHistory =
    await api.functional.orderStatusHistories.post(connection, {
      body: typia.random<IOrderStatusHistory.ICreate>(),
    });
  typia.assert(output);
}
