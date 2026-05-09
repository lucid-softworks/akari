// Test-time mock for react-native-webrtc. The real package is a
// native module that can't load under Jest's jsdom-ish environment;
// the StreamPlaceWebRTCPlayer only mounts on real devices, so unit
// tests just need this to resolve to *something*.

class StubMediaStream {
  toURL() {
    return 'mediastream://stub';
  }
}

class StubRTCSessionDescription {
  constructor(init) {
    this.type = init.type;
    this.sdp = init.sdp;
  }
}

class StubRTCPeerConnection {
  constructor() {
    this.connectionState = 'new';
    this.iceGatheringState = 'new';
    this.localDescription = null;
  }
  addTransceiver() {}
  async createOffer() {
    return new StubRTCSessionDescription({ type: 'offer', sdp: '' });
  }
  async setLocalDescription() {}
  async setRemoteDescription() {}
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

const RTCView = () => null;

module.exports = {
  MediaStream: StubMediaStream,
  RTCSessionDescription: StubRTCSessionDescription,
  RTCPeerConnection: StubRTCPeerConnection,
  RTCView,
};
