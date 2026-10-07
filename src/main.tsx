import { render } from 'preact';
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';

const root = document.getElementById('root');
if (root) render(<main id="app">Pismo Zones</main>, root);
