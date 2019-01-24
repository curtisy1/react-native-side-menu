import React from 'react';
import {
  PanResponder,
  View,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import styles from './styles';


interface SideMenuEvent {
  nativeEvent: {
    layout: {
      width: number,
      height: number,
    },
  },
};

interface SideMenuProps {
  edgeHitWidth: number,
  toleranceX: number,
  toleranceY: number,
  menuPosition: 'left' | 'right',
  onChange: (isOpen: boolean) => void,
  onMove: (moveOffset: number) => void,
  onSliding: (left: number) => void,
  openMenuOffset: number,
  hiddenMenuOffset: number,
  disableGestures: boolean,
  onAnimationComplete: () => void,
  onStartShouldSetPanResponderCapture: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => boolean,
  isOpen: boolean,
  bounceBackOnOverdraw: boolean,
  autoClosing: boolean,
  children?: JSX.Element | JSX.Element[],
  menu?: JSX.Element,
  animationStyle: (animateValue: Animated.Value) => any,
  animation: (prop: Animated.Value | Animated.ValueXY, value: number | Animated.Value | Animated.ValueXY) => Animated.CompositeAnimation,
};

interface SideMenuState {
  width: number,
  height: number,
  openOffsetMenuPercentage: number,
  openMenuOffset: number,
  hiddenMenuOffsetPercentage: number,
  hiddenMenuOffset: number,
  left: Animated.Value,
  isOpen: boolean;
  prevLeft: number;
};

const deviceScreen = Dimensions.get('window');
const barrierForward = deviceScreen.width / 4;
const shouldOpenMenu = (dx: number) => dx > barrierForward;

export default class SideMenu extends React.Component<SideMenuProps, SideMenuState> {
  onStartShouldSetPanResponderCapture: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => boolean;
  onMoveShouldSetPanResponder: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => boolean;
  onPanResponderMove: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => void;
  onPanResponderRelease: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => void;
  onPanResponderTerminate: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => void;
  publicLeft: number;
  responder: PanResponderInstance;

  static defaultProps: SideMenuProps = {
    toleranceY: 10,
    toleranceX: 10,
    edgeHitWidth: 60,
    openMenuOffset: deviceScreen.width * (2 / 3),
    disableGestures: false,
    menuPosition: 'left',
    hiddenMenuOffset: 0,
    onMove: () => null,
    onStartShouldSetPanResponderCapture: () => true,
    onChange: () => null,
    onSliding: () => null,
    animationStyle: value => ({
      transform: [{
        translateX: value,
      }],
    }),
    animation: (prop, value) => Animated.spring(prop, {
      toValue: value,
      friction: 8,
    }),
    onAnimationComplete: () => null,
    isOpen: false,
    bounceBackOnOverdraw: true,
    autoClosing: true,
  };

  constructor(props: SideMenuProps) {
    super(props);

    this.publicLeft = 0;

    const initialMenuPositionMultiplier = props.menuPosition === 'right' ? -1 : 1;
    const openOffsetMenuPercentage = props.openMenuOffset / deviceScreen.width;
    const hiddenMenuOffsetPercentage = props.hiddenMenuOffset / deviceScreen.width;
    const left: Animated.Value = new Animated.Value(
      this.props.isOpen
        ? props.openMenuOffset * initialMenuPositionMultiplier
        : props.hiddenMenuOffset,
    );

    this.onLayoutChange = this.onLayoutChange.bind(this);
    this.onStartShouldSetPanResponderCapture = props.onStartShouldSetPanResponderCapture.bind(this);
    this.onMoveShouldSetPanResponder = this.handleMoveShouldSetPanResponder.bind(this);
    this.onPanResponderMove = this.handlePanResponderMove.bind(this);
    this.onPanResponderRelease = this.handlePanResponderEnd.bind(this);
    this.onPanResponderTerminate = this.handlePanResponderEnd.bind(this);

    this.responder = PanResponder.create({
      onStartShouldSetPanResponderCapture: this.onStartShouldSetPanResponderCapture,
      onMoveShouldSetPanResponder: this.onMoveShouldSetPanResponder,
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderRelease: this.onPanResponderRelease,
      onPanResponderTerminate: this.onPanResponderTerminate,
    });

    this.state = {
      width: deviceScreen.width,
      height: deviceScreen.height,
      openOffsetMenuPercentage,
      openMenuOffset: deviceScreen.width * openOffsetMenuPercentage,
      hiddenMenuOffsetPercentage,
      hiddenMenuOffset: deviceScreen.width * hiddenMenuOffsetPercentage,
      left,
      isOpen: this.props.isOpen,
      prevLeft: 0,
    };

    this.state.left.addListener(({ value }) => {
      this.publicLeft = value;
      this.props.onSliding(Math.abs((value - this.state.hiddenMenuOffset) / (this.state.openMenuOffset - this.state.hiddenMenuOffset)))
    });
  }

  componentWillReceiveProps(props: SideMenuProps) {
    if (this.props.isOpen && (props.autoClosing || !this.props.isOpen)) {
      this.openMenu(this.props.isOpen);
    }
  }

  onLayoutChange(e: SideMenuEvent) {
    const { width, height } = e.nativeEvent.layout;
    const openMenuOffset = width * this.state.openOffsetMenuPercentage;
    const hiddenMenuOffset = width * this.state.hiddenMenuOffsetPercentage;
    this.setState({ width, height, openMenuOffset, hiddenMenuOffset });
  }

  getContentView() {
    let overlay: JSX.Element = <></>;

    if (this.state.isOpen) {
      overlay = (
        <TouchableWithoutFeedback onPress={() => this.openMenu(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      );
    }

    const { width, height } = this.state;
    const style = [
      styles.frontView,
      { width, height },
      this.props.animationStyle(this.state.left),
    ];

    return (
      <Animated.View style={style} {...this.responder.panHandlers}>
        {this.props.children}
        {overlay}
      </Animated.View>
    );
  }

  moveLeft(offset: number) {
    const newOffset = this.menuPositionMultiplier() * offset;

    this.props
      .animation(this.state.left, newOffset)
      .start(this.props.onAnimationComplete);

    this.setState({ prevLeft: newOffset });
  }

  menuPositionMultiplier = () => this.props.menuPosition === 'right' ? -1 : 1;

  handlePanResponderMove(e: GestureResponderEvent, gestureState: PanResponderGestureState) {
    if (this.publicLeft * this.menuPositionMultiplier() >= 0) {
      let newLeft = this.state.prevLeft + gestureState.dx;

      if (!this.props.bounceBackOnOverdraw && Math.abs(newLeft) > this.state.openMenuOffset) {
        newLeft = this.menuPositionMultiplier() * this.state.openMenuOffset;
      }

      this.props.onMove(newLeft);
      this.state.left.setValue(newLeft);
    }
  }

  handlePanResponderEnd(e: GestureResponderEvent, gestureState: PanResponderGestureState) {
    const offsetLeft = this.menuPositionMultiplier() *
      (this.publicLeft + gestureState.dx);

    this.openMenu(shouldOpenMenu(offsetLeft));
  }

  handleMoveShouldSetPanResponder(e: GestureResponderEvent, gestureState: PanResponderGestureState) {
    if (this.gesturesAreEnabled()) {
      const x = Math.round(Math.abs(gestureState.dx));
      const y = Math.round(Math.abs(gestureState.dy));

      const touchMoved = x > this.props.toleranceX && y < this.props.toleranceY;

      if (this.state.isOpen) {
        return touchMoved;
      }

      const withinEdgeHitWidth = this.props.menuPosition === 'right' ?
        gestureState.moveX > (deviceScreen.width - this.props.edgeHitWidth) :
        gestureState.moveX < this.props.edgeHitWidth;

      const swipingToOpen = this.menuPositionMultiplier() * gestureState.dx > 0;
      return withinEdgeHitWidth && touchMoved && swipingToOpen;
    }

    return false;
  }

  openMenu(isOpen: boolean) {
    const { hiddenMenuOffset, openMenuOffset } = this.state;
    this.moveLeft(isOpen ? openMenuOffset : hiddenMenuOffset);
    this.setState({ isOpen });

    this.forceUpdate();
    this.props.onChange(isOpen);
  }

  gesturesAreEnabled = () => !this.props.disableGestures;

  render() {
    const boundryStyle = this.props.menuPosition === 'right' ?
      { left: this.state.width - this.state.openMenuOffset } :
      { right: this.state.width - this.state.openMenuOffset };

    const menu = (
      <View style={[styles.menu, boundryStyle]}>
        {this.props.menu}
      </View>
    );

    return (
      <View
        style={styles.container}
        onLayout={this.onLayoutChange}
      >
        {menu}
        {this.getContentView()}
      </View>
    );
  }
}