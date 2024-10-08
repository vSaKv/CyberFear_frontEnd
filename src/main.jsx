import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from "react-router-dom";
import { App } from './App'
import './index.scss'
import { Suspense } from 'react'
import Loader from "/src/components/loader"

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
      <Suspense fallback={<Loader></Loader>}>
    <App />
      </Suspense>
  </Router>,
)
