import { Platform } from 'react-native';

const DateTimeFieldImpl =
  Platform.OS === 'web'
    ? require('./DateTimeField.web')
    : require('./DateTimeField.native');

export const DateTimeField = DateTimeFieldImpl.DateTimeField as (props: {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
}) => any;
