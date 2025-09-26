import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App'
import './index.css'
import { UserProvider } from './context/UserContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <HashRouter>
        <UserProvider>
          <App />
        </UserProvider>
      </HashRouter>
    </ChakraProvider>
  </React.StrictMode>,
)
