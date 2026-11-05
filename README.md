# gym-timer

Mobile-first rest timer for gym workouts that also counts sets per exercise per day. No backend;
all data stays on the device. See `PLAN.md` for decisions and build order.

## Node 24

This project needs Node 24 (Vite 8). The shell default Node is 18 on purpose for other projects,
so do not change it or run `nvm use`. Instead, prepend the Node 24 bin directory to `PATH` in each
command:

```bash
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm install
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run dev
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run build
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run format
```

Use whichever `v24.x` directory exists under `~/.nvm/versions/node/`.
