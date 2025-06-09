import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISection } from "@ORGANIZATION/PROJECT-api/lib/structures/ISection";

export async function test_api_sections_post(connection: api.IConnection) {
  const output: ISection = await api.functional.sections.post(connection, {
    body: typia.random<ISection.ICreate>(),
  });
  typia.assert(output);
}
