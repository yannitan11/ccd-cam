// CCD Cam — "Play" mode: review captured prints like flipping through shots on
// the camera. A lightbox shows one print large with prev/next, a counter, and an
// optional auto-advancing slideshow.

const SLIDESHOW_MS = 2600;

export class PlayMode {
  /** @param {import('./polaroid.js').PolaroidBoard} board */
  constructor(board) {
    this.board = board;
    this.index = 0;
    this.isOpen = false;
    this.timer = null;
    this._lastFocus = null;
    this._buildDom();
    this._bindKeys();
  }

  get count() {
    return this.board.prints.length;
  }

  _buildDom() {
    const el = document.createElement('div');
    el.className = 'play';
    el.id = 'play';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Photo playback');
    el.hidden = true;
    el.innerHTML = `
      <button class="play__close" type="button" aria-label="Close playback">✕</button>
      <button class="play__nav play__nav--prev" type="button" aria-label="Previous photo">◀</button>
      <figure class="play__frame">
        <img class="play__photo" alt="Captured memory" draggable="false" />
        <figcaption class="play__lip"></figcaption>
      </figure>
      <button class="play__nav play__nav--next" type="button" aria-label="Next photo">▶</button>
      <div class="play__bar">
        <button class="play__slideshow" type="button" aria-pressed="false">▶ Slideshow</button>
        <span class="play__counter" aria-live="polite">0 / 0</span>
      </div>
    `;
    document.body.appendChild(el);

    this.el = el;
    this.photo = el.querySelector('.play__photo');
    this.counter = el.querySelector('.play__counter');
    this.slideshowBtn = el.querySelector('.play__slideshow');
    this.prevBtn = el.querySelector('.play__nav--prev');
    this.nextBtn = el.querySelector('.play__nav--next');

    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    el.querySelector('.play__close').addEventListener('click', () => this.hide());
    this.slideshowBtn.addEventListener('click', () => this.toggleSlideshow());
    // Click the dim backdrop (but not the frame/controls) to close.
    el.addEventListener('click', (e) => {
      if (e.target === el) this.hide();
    });
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      switch (e.key) {
        case 'Escape': this.hide(); break;
        case 'ArrowLeft': this.prev(); break;
        case 'ArrowRight': this.next(); break;
        case ' ':
          e.preventDefault();
          this.toggleSlideshow();
          break;
      }
    });
  }

  show() {
    if (!this.count) return;
    this.isOpen = true;
    this.index = this.count - 1; // start at the most recent shot
    this._lastFocus = document.activeElement;
    this.el.hidden = false;
    // Next frame → transition in. rAF gives the paint needed for the fade;
    // the timeout is a fallback in case rAF is throttled (backgrounded tab).
    requestAnimationFrame(() => this.el.classList.add('is-open'));
    setTimeout(() => { if (this.isOpen) this.el.classList.add('is-open'); }, 40);
    document.body.classList.add('play-open');
    this._render();
    this.el.querySelector('.play__close').focus();
  }

  hide() {
    this.isOpen = false;
    this._stopSlideshow();
    this.el.classList.remove('is-open');
    document.body.classList.remove('play-open');
    // Wait for the fade-out before hiding for a11y.
    setTimeout(() => { if (!this.isOpen) this.el.hidden = true; }, 220);
    this._lastFocus?.focus?.();
  }

  next() {
    if (this.count < 2) return;
    this.index = (this.index + 1) % this.count;
    this._render();
  }

  prev() {
    if (this.count < 2) return;
    this.index = (this.index - 1 + this.count) % this.count;
    this._render();
  }

  toggleSlideshow() {
    if (this.timer) this._stopSlideshow();
    else this._startSlideshow();
  }

  _startSlideshow() {
    if (this.count < 2) return;
    this.timer = setInterval(() => this.next(), SLIDESHOW_MS);
    this.slideshowBtn.textContent = '⏸ Pause';
    this.slideshowBtn.setAttribute('aria-pressed', 'true');
  }

  _stopSlideshow() {
    clearInterval(this.timer);
    this.timer = null;
    this.slideshowBtn.textContent = '▶ Slideshow';
    this.slideshowBtn.setAttribute('aria-pressed', 'false');
  }

  _render() {
    const print = this.board.prints[this.index];
    if (!print) return;
    const src = print.el.querySelector('.polaroid__photo')?.src;
    if (src) this.photo.src = src;
    this.counter.textContent = `${this.index + 1} / ${this.count}`;
    const solo = this.count < 2;
    this.prevBtn.disabled = solo;
    this.nextBtn.disabled = solo;
    this.slideshowBtn.disabled = solo;
    // Re-trigger the fade each change.
    this.photo.classList.remove('is-in');
    void this.photo.offsetWidth;
    this.photo.classList.add('is-in');
  }
}
