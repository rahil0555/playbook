import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StandaloneApp } from './standalone/StandaloneApp';
import { Gallery } from './standalone/Gallery';

const showGallery = new URLSearchParams(window.location.search).has('gallery');

createRoot(document.getElementById('root') as HTMLElement).render(<StrictMode>{showGallery ? <Gallery /> : <StandaloneApp />}</StrictMode>);
