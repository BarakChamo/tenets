package = "tenets-invariant-lua"
version = "0.1.0-1"
source = {
	url = "git+https://github.com/BarakChamo/tenets.git",
	branch = "main",
	dir = "packages/invariant-lua",
}
description = {
	summary = "Dependency-free invariant checks for Lua and Luau",
	detailed = "Invariant checks that throw structured errors with stable metadata.",
	homepage = "https://github.com/BarakChamo/tenets",
	license = "MIT",
}
dependencies = { "lua >= 5.1" }
build = {
	type = "builtin",
	modules = {
		tenets_invariant = "src/tenets_invariant.lua",
	},
}
