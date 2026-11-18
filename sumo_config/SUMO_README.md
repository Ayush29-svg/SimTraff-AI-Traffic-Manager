# How to run in SUMO GUI (Windows)

This folder contains the native SUMO configuration for the SmartFlow intersection.

### Prerequisites
1. Download and install SUMO from [eclipse.dev/sumo](https://eclipse.dev/sumo/).
2. Export this project as a ZIP from AI Studio and extract it.

### Step 1: Generate the Network File
SUMO needs a `.net.xml` file. Open your terminal in this folder and run:
```bash
netconvert --node-files=intersection.nod.xml --edge-files=intersection.edg.xml --output-file=intersection.net.xml
```

### Step 2: Open in SUMO GUI
1. Open the **SUMO-GUI** application on your Windows machine.
2. Go to **File > Open Simulation...**
3. Select the `intersection.sumocfg` file in this folder.
4. Click the **Play** button in the top toolbar to start the simulation.

### Note on Traffic Lights
The `traffic_light` type is assigned to the center node. You can edit the specific signal timings using the **Netedit** tool included with SUMO if you wish to match the exact "Phase Alpha/Omega" timings from the web app.
