import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartTemplate";

export async function test_api_cartTemplates_post(connection: api.IConnection) {
  const output: ICartTemplate = await api.functional.cartTemplates.post(
    connection,
    {
      body: typia.random<ICartTemplate.ICreate>(),
    },
  );
  typia.assert(output);
}
