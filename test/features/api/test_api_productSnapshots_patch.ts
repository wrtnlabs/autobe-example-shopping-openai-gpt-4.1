import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductSnapshot";
import { IProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSnapshot";

export async function test_api_productSnapshots_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductSnapshot =
    await api.functional.productSnapshots.patch(connection, {
      body: typia.random<IProductSnapshot.IRequest>(),
    });
  typia.assert(output);
}
