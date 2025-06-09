import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderSnapshot";

export async function test_api_orderSnapshots_putById(
  connection: api.IConnection,
) {
  const output: IOrderSnapshot = await api.functional.orderSnapshots.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IOrderSnapshot.IUpdate>(),
    },
  );
  typia.assert(output);
}
