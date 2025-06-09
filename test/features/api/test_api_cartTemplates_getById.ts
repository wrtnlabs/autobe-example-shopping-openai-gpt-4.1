import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartTemplate";

export async function test_api_cartTemplates_getById(
  connection: api.IConnection,
) {
  const output: ICartTemplate = await api.functional.cartTemplates.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
