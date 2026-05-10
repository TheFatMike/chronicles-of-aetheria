# Chronicles of Aetheria 🌌

Welcome to **Chronicles of Aetheria**, my personal MMORPG sandbox built with React, Three.js, and a Node.js backend.  This game lets you explore a handcrafted world, collect loot, complete quests, trade with other heroes, and fully customize your character.

## Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/chronicles-of-aetheria.git
   cd chronicles-of-aetheria
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up environment** – copy the example file and add your Firebase and Gemini keys:
   ```bash
   cp .env.example .env
   # edit .env with your credentials
   ```
4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in a browser.

## What you’ll find
- **Dynamic quest system** – quests chain together, auto‑track collection items, and update instantly when you receive items via trade.
- **Rich inventory** – stacking, splitting, and drag‑and‑drop with camera‑blocking UI.
- **Player‑to‑player trading** – safe item exchange that automatically syncs quest progress.
- **Character selection** – up to six heroes, with a clean UI that hides the “new character” button once the limit is reached.
- **Procedural terrain & movement** – smooth camera, physics‑driven movement, and server‑side persistence.

## Contributing
Feel free to open issues or submit pull requests.  If you add new features, keep the UI consistent with the dark‑gold aesthetic and update the quest‑sync logic so that any new item type works out‑of‑the‑box.

## License
This project is shared under the Apache‑2.0 License.
