import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StandaloneApp } from './standalone/StandaloneApp';
import { Gallery } from './standalone/Gallery';
import { HostExample } from './standalone/HostExample';

// /            -> the standalone PlayLab app
// /?host       -> example of the main app embedding <PlayLab /> (integration reference)
// /?gallery    -> review every bundled illustration
const params = new URLSearchParams(window.location.search);
const Root = params.has('gallery') ? Gallery : params.has('host') ? HostExample : StandaloneApp;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
