import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBulletin";

export async function test_api_productBulletins_getById(
  connection: api.IConnection,
) {
  const output: IProductBulletin =
    await api.functional.productBulletins.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
