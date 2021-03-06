import { StyleSheet } from 'react-native';

const absoluteStretch = {
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

export default StyleSheet.create({
  container: {
    ...absoluteStretch,
    justifyContent: "center",
  },
  menu: {
    ...absoluteStretch,
    flex: 1,
    backgroundColor: 'transparent',
  },
  frontView: {
    flex: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  overlay: {
    ...absoluteStretch,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    width: 230,
  },
});
