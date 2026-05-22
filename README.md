---

# ⚡ CircuitJS

**An interactive, visual, and easy-to-use electronic circuit simulator right in your browser!**

## 📖 What is CircuitJS?

Imagine a digital sandbox where you can build electronic circuits with batteries, LEDs, resistors, and wires, and instantly see how the electricity flows—without burning your fingers, wasting real-world materials, or blowing any actual fuses!

CircuitJS is a web-based app that lets you design and test circuits visually. Whether you are a student learning about electricity for the first time, a hobbyist testing an idea, or just someone who likes playing with digital tools, CircuitJS makes electronics accessible to everyone.

---

## ✨ Features (What can it do?)

* 🧲 **Drag & Drop Building:** Simply drag components from the menu and drop them onto the grid.
* 🚦 **Real-Time Visuals:** Watch the circuit come to life! You can actually *see* the electricity moving.
* **Current Dots:** Little moving dots show you the direction and speed of the electrical current.
* **Voltage Colors:** Wires change color to show how much voltage (electrical pressure) is running through them.


* 🧰 **Fully Stocked Parts Bin:** Includes all the essential components:
* Power sources (Batteries/Voltage Sources)
* Resistors (to slow down the current)
* Capacitors & Inductors (to store energy)
* Diodes & LEDs (lights!)
* Switches (to turn things on and off)


* 📱 **Mobile Friendly:** Want to build circuits on your phone? The app includes a mobile-optimized toolbar and touch controls!
* 📈 **Advanced Plotter:** Need to see the exact numbers? Use the built-in graphing tool to plot the voltage and current over time, just like a real-world oscilloscope.

---

## 🎮 How to Use It (For Ordinary People)

You don't need to be an engineer to use this. Here is how you build your first circuit:

1. **Pick a Part:** Look at the **Component Palette** on the side (or bottom on mobile). Tap or click on a Battery.
2. **Place It:** Click anywhere on the dotted grid to place the battery.
3. **Add a Light:** Grab an **LED** and a **Resistor** from the palette and place them on the grid. *(Tip: LEDs usually need a resistor so they don't blow up from too much power!)*
4. **Wire it Up:** Select the **Wire** tool. Click and drag between the ends of your components to connect them in a loop.
5. **Watch it Glow:** Once the loop is closed, the simulation starts automatically. You'll see the dots moving and the LED light up! You can click on any component to change its properties (like making the battery stronger).

---

## 🛠️ How to Run it on Your Computer (For Tinkers & Developers)

If you want to download the code, play with it, or help build it, follow these steps to get it running on your own machine.

### Prerequisites

You only need one thing installed on your computer before you start: **Node.js** (This is a program that lets your computer run JavaScript tools).

* [Download Node.js here](https://nodejs.org/) (Download the "LTS" version).

### Installation Steps

**Step 1:** Download the code.
If you use Git, open your terminal and run:

```bash
git clone https://github.com/Sayanthegamer/circuitjs.git

```

*(Alternatively, you can just click the green "Code" button at the top of this page and click "Download ZIP", then extract it).*

**Step 2:** Open the project folder.
Open your terminal (or Command Prompt) and move into the `circuit-sim` folder where all the actual app code lives:

```bash
cd circuitjs/circuit-sim

```

**Step 3:** Install the necessary building blocks.
Tell Node to download all the open-source libraries this project relies on (like React and Vite) by typing:

```bash
npm install

```

**Step 4:** Start the app!
Turn on the local server by typing:

```bash
npm run dev

```

**Step 5:** Open your browser.
Your terminal will give you a local web link (usually something like `http://localhost:5173`). Click it, and you're ready to start building circuits!

---

## 🧠 Under the Hood (How does it work?)

For the tech-curious, here is how the magic happens without making your brain hurt:

* **The Face of the App (Frontend):** The entire user interface is built using **React** and **TypeScript**. This makes the app snappy, responsive, and easy to maintain. It uses **Vite** to package everything up super fast.
* **The Brain (The Engine):** Behind the scenes, the app uses some clever math (specifically, matrix equations). When you draw a wire or add a resistor, the engine translates that drawing into mathematical equations and solves them dozens of times per second to figure out exactly how much current should be flowing where.
* **The Canvas (Rendering):** The grid, the wires, and the moving current dots are drawn using HTML5 Canvas, which is designed to handle smooth, high-speed animations.

---

## 🤝 Contributing

Found a bug? Have an idea for a new component (like a motor or a buzzer)? Contributions are welcome!

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is open-source. Please see the `COPYING.txt` file for more details.
