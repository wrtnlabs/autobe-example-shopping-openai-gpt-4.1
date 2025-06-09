import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSnapshot";

export async function test_api_productSnapshots_eraseById(
  connection: api.IConnection,
) {
  const output: IProductSnapshot =
    await api.functional.productSnapshots.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
