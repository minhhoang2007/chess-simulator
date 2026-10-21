class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.preloadChessComSounds();
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private preloadChessComSounds() {
    if (typeof window === 'undefined') return;

    const soundNames = [
      'move-self',
      'move-opponent',
      'capture',
      'move-check',
      'castle',
      'promote',
      'game-start',
      'game-end',
      'illegal'
    ];

    for (const name of soundNames) {
      const url = `/sounds/${name}.mp3`;
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.audioElements.set(name, audio);

        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.arrayBuffer();
          })
          .then((buf) => {
            this.initContext();
            if (this.ctx) {
              return this.ctx.decodeAudioData(buf);
            }
            return null;
          })
          .then((decoded) => {
            if (decoded) {
              this.audioBuffers.set(name, decoded);
            }
          })
          .catch(() => {
            // Audio elements will serve as fallback
          });
      } catch {
        // Ignore preload errors
      }
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private playSound(name: string) {
    if (!this.enabled) return;
    this.initContext();

    const buffer = this.audioBuffers.get(name);
    if (buffer && this.ctx && this.ctx.state === 'running') {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch {
        // Fallback to HTMLAudioElement
      }
    }

    const el = this.audioElements.get(name);
    if (el) {
      try {
        el.currentTime = 0;
        el.play().catch(() => {});
      } catch {
        // Ignore playback error
      }
    }
  }

  public playMove(isOpponent: boolean = false) {
    this.playSound(isOpponent ? 'move-opponent' : 'move-self');
  }

  public playCapture() {
    this.playSound('capture');
  }

  public playCheck() {
    this.playSound('move-check');
  }

  public playCastle() {
    this.playSound('castle');
  }

  public playPromote() {
    this.playSound('promote');
  }

  public playGameStart() {
    this.playSound('game-start');
  }

  public playVictory() {
    this.playSound('game-end');
  }

  public playDefeat() {
    this.playSound('game-end');
  }

  public playIllegal() {
    this.playSound('illegal');
  }
}

export const sounds = new SoundSynthesizer();
