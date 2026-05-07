import ReactDOM from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <ToastContainer
      position='bottom-left'
      autoClose={2000}
      theme="dark"
    />
  </>
)