import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOrderStatusHistory";
import { IOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderStatusHistory";

export async function test_api_orderStatusHistories_patch(
  connection: api.IConnection,
) {
  const output: IPageIOrderStatusHistory =
    await api.functional.orderStatusHistories.patch(connection, {
      body: typia.random<IOrderStatusHistory.IRequest>(),
    });
  typia.assert(output);
}
