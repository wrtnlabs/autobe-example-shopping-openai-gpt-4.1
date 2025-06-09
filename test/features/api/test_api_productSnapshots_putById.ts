import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSnapshot";

export async function test_api_productSnapshots_putById(
  connection: api.IConnection,
) {
  const output: IProductSnapshot =
    await api.functional.productSnapshots.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductSnapshot.IUpdate>(),
    });
  typia.assert(output);
}
