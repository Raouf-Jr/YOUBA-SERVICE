import { describe, expect, it } from "vitest";
import { databaseUrl } from "@/lib/db/client";

describe("database connection string", () => {
  it("accepts the string Neon gives, as is", () => {
    expect(
      databaseUrl(
        "postgresql://neondb_owner:p%40ss@ep-cool-name-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
      ),
    ).toBe("postgresql://neondb_owner:p%40ss@ep-cool-name-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require");
  });

  it("leaves other strings alone", () => {
    expect(databaseUrl("postgres://youba:youba@localhost:5432/youba")).toBe("postgres://youba:youba@localhost:5432/youba");
    expect(databaseUrl("pas une adresse")).toBe("pas une adresse");
  });
});
