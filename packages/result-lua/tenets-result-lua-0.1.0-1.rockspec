package = "tenets-result-lua"
version = "0.1.0-1"
source = {
	url = "git+https://github.com/BarakChamo/tenets.git",
	branch = "main",
	dir = "packages/result-lua",
}
description = {
	summary = "Dependency-free Result values for Lua and Luau",
	detailed = "Synchronous tagged Result values with composition and exception adapters.",
	homepage = "https://github.com/BarakChamo/tenets",
	license = "MIT",
}
dependencies = { "lua >= 5.1" }
build = {
	type = "builtin",
	modules = {
		tenets_result = "src/tenets_result.lua",
	},
}
