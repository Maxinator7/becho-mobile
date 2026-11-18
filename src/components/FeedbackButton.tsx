import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useBeta } from '../context/BetaContext';
import { IconButton } from './ui';

/** Speech-bubble button in screen headers that opens the beta feedback sheet. */
export const FeedbackButton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { openFeedback } = useBeta();
  return <IconButton name="message-draw" label="Send feedback" onPress={() => openFeedback()} style={style} />;
};
