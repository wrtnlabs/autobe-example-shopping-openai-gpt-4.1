import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICart";

export async function test_api_carts_post(connection: api.IConnection) {
  const output: ICart = await api.functional.carts.post(connection, {
    body: typia.random<ICart.ICreate>(),
  });
  typia.assert(output);
}
