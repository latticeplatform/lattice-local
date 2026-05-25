import { type FC } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import NavButton from './components/NavButton.tsx';
import ConnectorPage from './components/pages/ConnectorPage.tsx';
import { TiFlowSwitch } from 'react-icons/ti';
import { FaPlug } from 'react-icons/fa6';
import { FaArrowRightToBracket } from 'react-icons/fa6';
import ComposePage from './components/pages/ComposePage.tsx';

const App: FC = () => {
  return (
    <>
      <section id="center">
        <h1 className="title">
          <i>lattice</i>
        </h1>
        <div id="pages">
          <NavButton title="Collect" icon={FaArrowRightToBracket} path="/collect" />
          <NavButton title="Compose" icon={TiFlowSwitch} path="/compose" />
          <NavButton title="Connect" icon={FaPlug} path="/connect" />
        </div>
        <Routes>
          <Route path="/collect" element={<ConnectorPage type={'source'} />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/connect" element={<ConnectorPage type={'sink'} />} />
        </Routes>
      </section>
    </>
  );
};

export default App;
