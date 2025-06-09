import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISection } from "@ORGANIZATION/PROJECT-api/lib/structures/ISection";

export async function test_api_sections_eraseById(connection: api.IConnection) {
  const output: ISection = await api.functional.sections.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
