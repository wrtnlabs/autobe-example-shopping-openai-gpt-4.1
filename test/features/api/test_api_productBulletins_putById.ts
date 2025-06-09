import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBulletin";

export async function test_api_productBulletins_putById(
  connection: api.IConnection,
) {
  const output: IProductBulletin =
    await api.functional.productBulletins.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductBulletin.IUpdate>(),
    });
  typia.assert(output);
}
