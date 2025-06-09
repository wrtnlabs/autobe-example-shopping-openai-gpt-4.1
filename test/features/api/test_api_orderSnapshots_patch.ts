import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOrderSnapshot";
import { IOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderSnapshot";

export async function test_api_orderSnapshots_patch(
  connection: api.IConnection,
) {
  const output: IPageIOrderSnapshot = await api.functional.orderSnapshots.patch(
    connection,
    {
      body: typia.random<IOrderSnapshot.IRequest>(),
    },
  );
  typia.assert(output);
}
