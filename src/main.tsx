import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app.tsx'
import './styles/app.css'

render(<App registerSW={registerSW} />, document.getElementById('app')!)
