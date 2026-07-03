// CCD Cam — webcam plumbing + permission/lifecycle handling.

const STATE = { idle: 'idle', pending: 'pending', live: 'live', error: 'error' };

export class CameraFeed {
  /**
   * @param {HTMLVideoElement} video
   * @param {(state: string, detail?: any) => void} onState
   */
  constructor(video, onState) {
    this.video = video;
    this.onState = onState || (() => {});
    this.stream = null;
    this.state = STATE.idle;

    // Pause the track when the tab is backgrounded; resume on focus.
    document.addEventListener('visibilitychange', () => this._onVisibility());
  }

  _set(state, detail) {
    this.state = state;
    this.onState(state, detail);
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this._set(STATE.error, { reason: 'unsupported' });
      return;
    }
    this._set(STATE.pending);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      this.video.srcObject = this.stream;
      // Selfie mirror is handled in CSS (transform: scaleX(-1)).
      await this.video.play().catch(() => {});
      this._set(STATE.live);
    } catch (err) {
      this._set(STATE.error, { reason: err?.name || 'error' });
    }
  }

  /** Re-request permission after a denial. */
  retry() {
    this.stop();
    return this.start();
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getVideoTracks()) track.stop();
      this.stream = null;
    }
  }

  _onVisibility() {
    const track = this.stream?.getVideoTracks?.()[0];
    if (!track) return;
    // Keep the track but let it idle; play/pause the element to save power.
    if (document.hidden) this.video.pause();
    else this.video.play().catch(() => {});
  }

  get isLive() {
    return this.state === STATE.live;
  }
}

export { STATE as CAMERA_STATE };
