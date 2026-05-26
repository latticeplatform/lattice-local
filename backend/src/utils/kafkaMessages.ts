import type { KafkaTopicMessageWithValue } from '../types/index.js';

export const isKafkaTopicMessageWithValue = (
  message: unknown
): message is KafkaTopicMessageWithValue => {
  return (
    typeof message !== 'object' ||
    message === null ||
    !('value' in message) ||
    message.value === null ||
    !Buffer.isBuffer(message.value)
  );
};
