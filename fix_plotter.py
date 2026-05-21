plotter_path = "circuit-sim/src/ui/Plotter.tsx"
with open(plotter_path, "r") as f:
    plotter_content = f.read()

plotter_content = plotter_content.replace(
    "const [isMinimized, setIsMinimized] = useState(false);",
    "const isMinimized = useUIStore((s) => s.plotterMinimized);\n  const setIsMinimized = useUIStore((s) => s.setPlotterMinimized);"
)

if "import { useUIStore } from '../stores/uiStore';" not in plotter_content:
    plotter_content = plotter_content.replace(
        "import { useCircuitStore } from '../stores/circuitStore';",
        "import { useCircuitStore } from '../stores/circuitStore';\nimport { useUIStore } from '../stores/uiStore';"
    )

with open(plotter_path, "w") as f:
    f.write(plotter_content)
