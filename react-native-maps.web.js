// Web shim for react-native-maps
// This provides stub components for the web platform where react-native-maps is not supported
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = React.forwardRef((props, ref) => {
  return (
    <View style={[styles.container, props.style]} ref={ref}>
      <Text style={styles.text}>Map not available on web</Text>
      {props.children}
    </View>
  );
});

MapView.displayName = 'MapView';

const Marker = (props) => <View>{props.children}</View>;
const Polyline = () => null;
const Circle = () => null;
const Callout = (props) => <View>{props.children}</View>;
const CalloutSubview = (props) => <View>{props.children}</View>;
const Overlay = () => null;
const Heatmap = () => null;
const Geojson = () => null;

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#666',
    fontSize: 14,
  },
});

export {
  Marker,
  Polyline,
  Circle,
  Callout,
  CalloutSubview,
  Overlay,
  Heatmap,
  Geojson,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};

export default MapView;
