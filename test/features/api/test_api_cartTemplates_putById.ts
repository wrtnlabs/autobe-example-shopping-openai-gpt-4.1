import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartTemplate";

export async function test_api_cartTemplates_putById(
  connection: api.IConnection,
) {
  const output: ICartTemplate = await api.functional.cartTemplates.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICartTemplate.IUpdate>(),
    },
  );
  typia.assert(output);
}
