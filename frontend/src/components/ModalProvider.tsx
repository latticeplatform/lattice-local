import { useState, type FC, type PropsWithChildren } from 'react';
import { ModalContext, type ModalState } from '../context/ModalContext.tsx';
import ConnectorDetails from './modals/ConnectorDetails.tsx';
import ConnectorForm from './modals/ConnectorForm.tsx';
import TopicDetails from './modals/TopicDetails.tsx';

const ModalProvider: FC<PropsWithChildren> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>(null);

  const close = () => {
    setModal(null);
  };

  return (
    <ModalContext value={{ modal, open: setModal, close }}>
      {children}
      {modal?.kind === 'connector-details' && (
        <ConnectorDetails name={modal.name} onClose={close} />
      )}
      {modal?.kind === 'connector-form' && (
        <ConnectorForm pluginClass={modal.pluginClass} onClose={close} />
      )}
      {modal?.kind === 'topic-details' && (
        <TopicDetails name={modal.name} sourceConnector={modal.sourceConnector} onClose={close} />
      )}
    </ModalContext>
  );
};

export default ModalProvider;
