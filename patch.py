import re

ui_store_path = "circuit-sim/src/stores/uiStore.ts"
with open(ui_store_path, "r") as f:
    ui_store_content = f.read()

ui_store_content = ui_store_content.replace(
    "hoveredElm: ICircuitElement | null;",
    "hoveredElm: ICircuitElement | null;\n\n  // Plotter state\n  plotterMinimized: boolean;"
)
ui_store_content = ui_store_content.replace(
    "setHoveredElm: (elm: ICircuitElement | null) => void;",
    "setHoveredElm: (elm: ICircuitElement | null) => void;\n  setPlotterMinimized: (m: boolean) => void;"
)
ui_store_content = ui_store_content.replace(
    "hoveredElm: null,",
    "hoveredElm: null,\n  plotterMinimized: true,"
)
ui_store_content = ui_store_content.replace(
    "setHoveredElm: (elm) => set({ hoveredElm: elm }),",
    "setHoveredElm: (elm) => set({ hoveredElm: elm }),\n  setPlotterMinimized: (m) => set({ plotterMinimized: m }),"
)

with open(ui_store_path, "w") as f:
    f.write(ui_store_content)

plotter_path = "circuit-sim/src/ui/Plotter.tsx"
with open(plotter_path, "r") as f:
    plotter_content = f.read()

plotter_content = plotter_content.replace(
    "const [isMinimized, setIsMinimized] = useState(true);",
    "const isMinimized = useUIStore((s) => s.plotterMinimized);\n  const setIsMinimized = useUIStore((s) => s.setPlotterMinimized);"
)
plotter_content = plotter_content.replace(
    "import { useCircuitStore } from '../stores/circuitStore';",
    "import { useCircuitStore } from '../stores/circuitStore';\nimport { useUIStore } from '../stores/uiStore';"
)

with open(plotter_path, "w") as f:
    f.write(plotter_content)


app_path = "circuit-sim/src/App.tsx"
with open(app_path, "r") as f:
    app_content = f.read()

app_content = app_content.replace(
    "const tool = useUIStore((s) => s.tool);",
    "const tool = useUIStore((s) => s.tool);\n  const plotterMinimized = useUIStore((s) => s.plotterMinimized);"
)
# We don't want to change pb-[40px] if the user explicitly asked to "de fix it to make more space to work with".
# The reviewer noted: "The bottom padding currently hardcodes pb-[40px] which only accommodates the minimized Plotter and causes the expanded Plotter (h-[240px]) to overlay content; lift the Plotter's isMinimized state to a shared store or to the parent (App) and have the main wrapper in App toggle its padding class based on that state (apply pb-[40px] when Plotter.isMinimized is true and pb-[240px] when false)."
# Wait, the user's initial request was: "it is cropped to not let the ossiloscope graphs overlap it but i want the graphs to overlap it to maximise workspace area".
# The reviewer is asking to NOT overlap it with the PropertiesPanel / canvas. This contradicts the user request directly. Let's look closely at the reviewer's instructions.
