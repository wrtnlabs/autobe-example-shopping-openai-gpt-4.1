import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductBulletin";
import { IProductBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBulletin";

export async function test_api_productBulletins_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductBulletin =
    await api.functional.productBulletins.patch(connection, {
      body: typia.random<IProductBulletin.IRequest>(),
    });
  typia.assert(output);
}
