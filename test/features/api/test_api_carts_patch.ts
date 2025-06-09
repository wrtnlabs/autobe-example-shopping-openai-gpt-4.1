import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICart";
import { ICart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICart";

export async function test_api_carts_patch(connection: api.IConnection) {
  const output: IPageICart = await api.functional.carts.patch(connection, {
    body: typia.random<ICart.IRequest>(),
  });
  typia.assert(output);
}
