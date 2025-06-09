import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICart";

export async function test_api_carts_putById(connection: api.IConnection) {
  const output: ICart = await api.functional.carts.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<ICart.IUpdate>(),
  });
  typia.assert(output);
}
