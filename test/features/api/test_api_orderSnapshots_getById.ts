import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderSnapshot";

export async function test_api_orderSnapshots_getById(
  connection: api.IConnection,
) {
  const output: IOrderSnapshot = await api.functional.orderSnapshots.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
