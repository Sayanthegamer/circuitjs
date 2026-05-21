app_path = "circuit-sim/src/App.tsx"
with open(app_path, "r") as f:
    app_content = f.read()

app_content = app_content.replace(
    "bottom-[240px]",
    "${plotterMinimized ? 'bottom-[40px]' : 'bottom-[240px]'}"
)

# Convert className="fixed bottom-[240px] ... " to use a template literal since we injected JS variable interpolation
app_content = app_content.replace(
    'className="fixed ${plotterMinimized ? \'bottom-[40px]\' : \'bottom-[240px]\'} left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-surface border border-border-hairline text-xs font-mono text-text-primary shadow-xl"',
    'className={`fixed ${plotterMinimized ? \'bottom-[60px]\' : \'bottom-[260px]\'} left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-surface border border-border-hairline text-xs font-mono text-text-primary shadow-xl transition-all`}'
)

with open(app_path, "w") as f:
    f.write(app_content)
