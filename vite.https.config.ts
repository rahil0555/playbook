import basicSsl from '@vitejs/plugin-basic-ssl';
import { mergeConfig } from 'vite';
import baseConfig from './vite.config';

// `npm run dev:https`: the same dev server, served over https with a locally generated certificate. Speech recognition needs a
// secure page, so this is how a phone or another computer on the network can use the microphone (their browser will warn about the
// self-signed certificate once). A deployed site needs its own https address (see docs/VOICE.md).
export default mergeConfig(baseConfig, {
  plugins: [basicSsl()],
});
