app_path = "circuit-sim/src/App.tsx"
with open(app_path, "r") as f:
    app_content = f.read()

if "const plotterMinimized = useUIStore" not in app_content:
    app_content = app_content.replace(
        "const tool = useUIStore((s) => s.tool);",
        "const tool = useUIStore((s) => s.tool);\n  const plotterMinimized = useUIStore((s) => s.plotterMinimized);"
    )

with open(app_path, "w") as f:
    f.write(app_content)
