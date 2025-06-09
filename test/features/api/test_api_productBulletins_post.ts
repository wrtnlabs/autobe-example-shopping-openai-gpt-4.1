import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBulletin";

export async function test_api_productBulletins_post(
  connection: api.IConnection,
) {
  const output: IProductBulletin = await api.functional.productBulletins.post(
    connection,
    {
      body: typia.random<IProductBulletin.ICreate>(),
    },
  );
  typia.assert(output);
}
