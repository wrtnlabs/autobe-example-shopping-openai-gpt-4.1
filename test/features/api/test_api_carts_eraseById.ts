import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICart";

export async function test_api_carts_eraseById(connection: api.IConnection) {
  const output: ICart = await api.functional.carts.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
