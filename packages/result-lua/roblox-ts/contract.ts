import * as Result from "@rbxts/tenets-result-lua";

type Failure = { readonly type: "parse_failed" };
const parsed: Result.Result<number, Failure> = Result.ok(42);
const chained: Result.Result<string, Failure> = Result.andThen(
	parsed,
	(value) => Result.ok(`${value}`),
);
const all: Result.Result<Result.Combined<number>, Failure> = Result.combine([parsed]);
const mapped: Result.Result<number, Failure> = Result.trySync(
	() => 42,
	() => ({ type: "parse_failed" }),
);
void [chained, all, mapped];
