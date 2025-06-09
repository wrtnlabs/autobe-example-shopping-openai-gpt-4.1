import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICart";

export async function test_api_carts_getById(connection: api.IConnection) {
  const output: ICart = await api.functional.carts.getById(connection, {
    id: typia.random<string>(),
  });
  typia.assert(output);
}
