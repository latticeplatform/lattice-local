import { type FC } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import NavButton from "./components/NavButton.tsx";
import CollectPage from "./components/pages/CollectPage.tsx";
import { TiFlowSwitch } from "react-icons/ti";
import { FaPlug } from "react-icons/fa6";
import { FaArrowRightToBracket } from "react-icons/fa6";
import SinkPage from "./components/pages/SinkPage.tsx";



const App: FC = () => {
  return (
    <div className="page-transition">
      <div className="page-transition-inner">
        <section id="center">
          <h1 className="title"><i>loom</i></h1>
          <div id="pages">
            <NavButton title="Collect" icon={FaArrowRightToBracket} path="/collect" />
            <NavButton title="Compose" icon={TiFlowSwitch}          path="/compose" />
            <NavButton title="Connect" icon={FaPlug}                path="/connect" />
          </div>
        </section>

        <Routes>
          <Route path="/collect" element={ <CollectPage />   } />
          <Route path="/compose" element={ <div>Compose</div>} />
          <Route path="/connect" element={ <SinkPage />      } />
        </Routes>
      </div>
    </div>
  )
}

export default App
