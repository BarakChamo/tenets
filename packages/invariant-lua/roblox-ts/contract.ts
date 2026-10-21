import * as Invariant from "@rbxts/tenets-invariant-lua";

const check: Invariant.ConfiguredInvariant = Invariant.createInvariant({
	mode: "production",
	code: "ERR_STATE",
});
check(true);
Invariant.invariant(true, "must be truthy");
const recognized: boolean = Invariant.isInvariantError({ name: "InvariantError", code: "ERR_STATE" });
void recognized;
